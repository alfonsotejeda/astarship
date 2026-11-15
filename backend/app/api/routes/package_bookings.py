"""Package-scoped booking routes.

Mounted with prefix ``/packages/{package_id}/bookings`` in :mod:`app.api.router`.
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status as http_status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.api.deps.rules import get_approved_package
from app.db.session import get_db
from app.models.itinerary import Itinerary
from app.models.status import BookingStatus, ItineraryStatus
from app.models.user.user import User, UserRole
from app.models.user.tourist import Tourist
from app.schemas.booking import BookingCreate, BookingIn, BookingPatch, BookingRead, BookingUpdate
from app.services import booking as booking_service
from app.api.routes.booking import _to_read

router = APIRouter(prefix="/packages/{package_id}/bookings", tags=["package-bookings"])


def _require_tourist_row(db: Session, user: User) -> None:
    if db.get(Tourist, user.id) is None:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Tourist not found")


def _validate_preferred_itinerary(db: Session, package_id: int, itinerary_id: int) -> None:
    itinerary = db.get(Itinerary, itinerary_id)
    if itinerary is None or itinerary.package_id != package_id:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="El itinerario preferido no es de este paquete.",
        )
    if itinerary.status is not ItineraryStatus.APPROVED:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="El itinerario preferido no está aprobado.",
        )


@router.post(
    "", response_model=BookingRead, status_code=http_status.HTTP_201_CREATED
)
def create_booking(
    package_id: int,
    data: BookingIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BookingRead:
    """Enrol a tourist in a package (admin) or book for oneself (tourist)."""
    if current_user.role is not UserRole.ADMIN and current_user.role is not UserRole.TOURIST:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Solo los turistas reservan paquetes.",
        )
    package = get_approved_package(db, package_id)  # 404 missing / 409 not approved (RN-09)

    if current_user.role is UserRole.ADMIN:
        if data.tourist_id is None:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="tourist_id es obligatorio para el administrador",
            )
        tourist_id = data.tourist_id
        if db.get(Tourist, tourist_id) is None:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Tourist not found")
        if data.requested_start_date is not None and data.requested_start_date < date.today():
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Elige una fecha de inicio a partir de hoy.",
            )
        if data.preferred_itinerary_id is not None:
            _validate_preferred_itinerary(db, package_id, data.preferred_itinerary_id)
        requested_start_date = data.requested_start_date
        preferred_itinerary_id = data.preferred_itinerary_id
    else:
        _require_tourist_row(db, current_user)
        if data.tourist_id is not None and data.tourist_id != current_user.id:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="No puedes reservar para otro turista.",
            )
        if data.requested_start_date is None or data.requested_start_date < date.today():
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Elige una fecha de inicio a partir de hoy.",
            )
        if data.preferred_itinerary_id is not None:
            itinerary = db.get(Itinerary, data.preferred_itinerary_id)
            if itinerary is None:
                raise HTTPException(
                    status_code=http_status.HTTP_404_NOT_FOUND,
                    detail="Itinerary not found",
                )
            if itinerary.package_id != package_id:
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="El itinerario preferido no es de este paquete.",
                )
            if itinerary.status is not ItineraryStatus.APPROVED:
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="El itinerario preferido no está aprobado.",
                )
        tourist_id = current_user.id
        requested_start_date = data.requested_start_date
        preferred_itinerary_id = data.preferred_itinerary_id

    try:
        booking_data = BookingCreate(
            tourist_id=tourist_id,
            package_id=package_id,
            booking_date=date.today(),
            requested_start_date=requested_start_date,
            preferred_itinerary_id=preferred_itinerary_id,
            status=BookingStatus.PENDING,
        )
        booking = booking_service.create_booking(db, booking_data)
    except ValueError as exc:
        raise HTTPException(status_code=http_status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return _to_read(booking)


@router.patch("/{tourist_id}", response_model=BookingRead)
def update_booking(
    package_id: int,
    tourist_id: int,
    data: BookingPatch,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BookingRead:
    """Cancel (tourist owner) or reject (admin, with reason) a pending booking."""
    if data.status is BookingStatus.CANCELLED:
        if current_user.role is not UserRole.TOURIST or current_user.id != tourist_id:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Solo el turista cancela su reserva.",
            )
        rejection_reason = None
    elif data.status is BookingStatus.REJECTED:
        if current_user.role is not UserRole.ADMIN:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Solo el administrador rechaza reservas.",
            )
        if not data.rejection_reason or not data.rejection_reason.strip():
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Escribe el motivo del rechazo.",
            )
        rejection_reason = data.rejection_reason.strip()
    else:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Estado no admitido.",
        )

    booking = booking_service.get_booking(db, tourist_id, package_id)
    if booking is None:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.status is not BookingStatus.PENDING:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="Solo se puede cambiar una reserva pendiente.",
        )

    update = BookingUpdate(status=data.status, rejection_reason=rejection_reason)
    updated = booking_service.update_booking(db, booking, update)
    return _to_read(updated)


@router.delete("/{tourist_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_booking(
    package_id: int,
    tourist_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete a booking (admin only); 409 if it already has an itinerary."""
    if current_user.role is not UserRole.ADMIN:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Solo el administrador gestiona inscripciones.",
        )
    booking = booking_service.get_booking(db, tourist_id, package_id)
    if booking is None:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Booking not found")
    try:
        booking_service.delete_booking(db, booking)
    except ValueError as exc:
        raise HTTPException(status_code=http_status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return None
