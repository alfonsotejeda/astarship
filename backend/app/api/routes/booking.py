"""Booking routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps.auth import require_admin, require_admin_or_tourist
from app.api.deps.rules import forbid_acting_for_others
from app.db.session import get_db
from app.models.booking import Booking
from app.models.package import Package
from app.models.status import BookingStatus
from app.models.user.tourist import Tourist
from app.models.user.user import User, UserRole
from app.schemas.booking import BookingCreate, BookingRead, BookingUpdate
from app.services import booking as booking_service
from app.services import itinerary as itinerary_service
from app.services import package as package_service

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _get_tourist_or_404(db: Session, tourist_id: int) -> Tourist:
    """Return the tourist or raise a 404."""
    tourist = db.get(Tourist, tourist_id)
    if tourist is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tourist not found")
    return tourist


def _get_package_or_404(db: Session, package_id: int) -> Package:
    """Return the package or raise a 404."""
    package = package_service.get_package(db, package_id)
    if package is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")
    return package


def _ensure_itinerary_exists(db: Session, itinerary_id: int) -> None:
    """Raise a 404 if the itinerary doesn't exist."""
    if itinerary_service.get_itinerary(db, itinerary_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Itinerary not found")


def _get_booking_or_404(db: Session, tourist_id: int, package_id: int) -> Booking:
    """Return the booking or raise a 404."""
    booking = booking_service.get_booking(db, tourist_id, package_id)
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    return booking


def _raise_conflict(db: Session, exc: Exception) -> None:
    """Raise a 409 for a duplicate (tourist, package) pair.

    Rolls back only when the flush failed (IntegrityError); a duplicate detected
    by the pre-check leaves no pending state in the session.
    """
    if isinstance(exc, IntegrityError):
        db.rollback()
    conflict_detail = "Booking for this tourist and package already exists"
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=conflict_detail) from exc


def _forbid_tourist_assignment(
    user: User, *, data: BookingCreate | BookingUpdate, creating: bool
) -> None:
    """Keep itinerary assignment and admin decisions out of a tourist's payload."""
    if user.role is not UserRole.TOURIST:
        return
    if creating:
        decides_status = data.status is not BookingStatus.PENDING
    else:
        decides_status = data.status in (BookingStatus.ASSIGNED, BookingStatus.REJECTED)
    if data.itinerary_id is not None or data.rejection_reason is not None or decides_status:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tourists cannot assign itineraries or decide booking status",
        )


@router.get("", response_model=list[BookingRead], dependencies=[Depends(require_admin)])
def list_bookings(
    tourist_id: int | None = None, db: Session = Depends(get_db)
) -> list[BookingRead]:
    """List all bookings, optionally filtered by tourist id; admins only."""
    return booking_service.list_bookings(db, tourist_id=tourist_id)


@router.get("/{tourist_id}/{package_id}", response_model=BookingRead)
def get_booking(
    tourist_id: int,
    package_id: int,
    user: User = Depends(require_admin_or_tourist),
    db: Session = Depends(get_db),
) -> BookingRead:
    """Get a booking; only an admin or the tourist it belongs to."""
    forbid_acting_for_others(user, tourist_id)
    return _get_booking_or_404(db, tourist_id, package_id)


@router.post("", response_model=BookingRead, status_code=status.HTTP_201_CREATED)
def create_booking(
    data: BookingCreate,
    user: User = Depends(require_admin_or_tourist),
    db: Session = Depends(get_db),
) -> BookingRead:
    """Create a booking: an admin for any tourist, a tourist only for themselves.

    Tourists cannot send an itinerary, a rejection reason or a status other than
    ``pending``, since assigning an itinerary is an admin decision.
    """
    forbid_acting_for_others(user, data.tourist_id)
    _forbid_tourist_assignment(user, creating=True, data=data)
    _get_tourist_or_404(db, data.tourist_id)
    _get_package_or_404(db, data.package_id)
    if data.itinerary_id is not None:
        _ensure_itinerary_exists(db, data.itinerary_id)
    try:
        return booking_service.create_booking(db, data)
    except (ValueError, IntegrityError) as exc:
        # Only a duplicate pair is a conflict; missing resources are 404 and
        # any other validation failure is a 400.
        if isinstance(exc, IntegrityError) or "already exists" in str(exc):
            _raise_conflict(db, exc)
        status_code = (
            status.HTTP_404_NOT_FOUND if "not found" in str(exc) else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc


@router.delete("/{tourist_id}/{package_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_booking(
    tourist_id: int,
    package_id: int,
    user: User = Depends(require_admin_or_tourist),
    db: Session = Depends(get_db),
) -> None:
    """Delete a booking; only an admin or the tourist it belongs to."""
    forbid_acting_for_others(user, tourist_id)
    booking = _get_booking_or_404(db, tourist_id, package_id)
    booking_service.delete_booking(db, booking)


@router.patch("/{tourist_id}/{package_id}", response_model=BookingRead)
def update_booking(
    tourist_id: int,
    package_id: int,
    data: BookingUpdate,
    user: User = Depends(require_admin_or_tourist),
    db: Session = Depends(get_db),
) -> BookingRead:
    """Modify an existing booking.

    Admins may change any field. Tourists may only change their own booking and
    cannot assign an itinerary, reject it or set an ``assigned`` status.
    """
    forbid_acting_for_others(user, tourist_id)
    _forbid_tourist_assignment(user, creating=False, data=data)
    booking = _get_booking_or_404(db, tourist_id, package_id)
    try:
        return booking_service.update_booking(db, booking, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
