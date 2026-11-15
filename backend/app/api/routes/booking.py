"""Booking routes."""

from fastapi import APIRouter, Depends, HTTPException, status as http_status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.db.session import get_db
from app.models.booking import Booking
from app.models.status import BookingStatus
from app.models.user.user import User, UserRole
from app.schemas.booking import BookingRead
from app.services import booking as booking_service

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _get_booking_or_404(db: Session, tourist_id: int, package_id: int) -> Booking:
    """Return the booking or raise a 404."""
    booking = booking_service.get_booking(db, tourist_id, package_id)
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    return booking


def _to_read(booking: Booking) -> BookingRead:
    """Build the read schema, filling the derived names from the loaded
    ``tourist`` and ``package`` relationships (session must be open)."""
    return BookingRead(
        tourist_id=booking.tourist_id,
        package_id=booking.package_id,
        booking_date=booking.booking_date,
        requested_start_date=booking.requested_start_date,
        preferred_itinerary_id=booking.preferred_itinerary_id,
        resolved_date=booking.resolved_date,
        itinerary_id=booking.itinerary_id,
        rejection_reason=booking.rejection_reason,
        status=booking.status,
        tourist_name=booking.tourist.user.name,
        package_name=booking.package.name,
    )


@router.get("", response_model=list[BookingRead])
def list_bookings(
    status: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[BookingRead]:
    """List all bookings (admin only), optionally filtered by status, oldest first."""
    if current_user.role is not UserRole.ADMIN:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Solo el administrador ve todas las reservas.",
        )
    booking_status = None
    if status is not None:
        try:
            booking_status = BookingStatus(status)
        except ValueError as exc:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Invalid status"
            ) from exc
    return [_to_read(b) for b in booking_service.list_bookings(db, status=booking_status)]


@router.get("/{tourist_id}/{package_id}", response_model=BookingRead)
def get_booking(tourist_id: int, package_id: int, db: Session = Depends(get_db)) -> BookingRead:
    """Get a single booking by its tourist and package ids."""
    return _to_read(_get_booking_or_404(db, tourist_id, package_id))
