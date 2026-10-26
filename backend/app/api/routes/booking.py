"""Booking routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.booking import Booking
from app.models.package import Package
from app.models.user.tourist import Tourist
from app.schemas.booking import BookingCreate, BookingRead
from app.services import booking as booking_service
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Package not found"
        )
    return package


def _get_booking_or_404(db: Session, tourist_id: int, package_id: int) -> Booking:
    """Return the booking or raise a 404."""
    booking = booking_service.get_booking(db, tourist_id, package_id)
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found"
        )
    return booking


def _raise_conflict(db: Session, exc: Exception) -> None:
    """Raise a 409 for a duplicate (tourist, package) pair.

    Rolls back only when the flush failed (IntegrityError); a ValueError
    from the pre-check leaves no pending state in the session.
    """
    if isinstance(exc, IntegrityError):
        db.rollback()
    conflict_detail = "Booking for this tourist and package already exists"
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=conflict_detail) from exc


@router.get("", response_model=list[BookingRead])
def list_bookings(
    tourist_id: int | None = None, db: Session = Depends(get_db)
) -> list[BookingRead]:
    """List all bookings, optionally filtered by tourist id."""
    return booking_service.list_bookings(db, tourist_id=tourist_id)


@router.get("/{tourist_id}/{package_id}", response_model=BookingRead)
def get_booking(
    tourist_id: int, package_id: int, db: Session = Depends(get_db)
) -> BookingRead:
    """Get a single booking by its tourist and package ids."""
    return _get_booking_or_404(db, tourist_id, package_id)


@router.post("", response_model=BookingRead, status_code=status.HTTP_201_CREATED)
def create_booking(data: BookingCreate, db: Session = Depends(get_db)) -> BookingRead:
    """Create a booking between an existing tourist and an existing package."""
    _get_tourist_or_404(db, data.tourist_id)
    _get_package_or_404(db, data.package_id)
    try:
        return booking_service.create_booking(db, data)
    except (ValueError, IntegrityError) as exc:
        _raise_conflict(db, exc)


@router.delete("/{tourist_id}/{package_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_booking(tourist_id: int, package_id: int, db: Session = Depends(get_db)) -> None:
    """Delete a booking by its tourist and package ids."""
    booking = _get_booking_or_404(db, tourist_id, package_id)
    booking_service.delete_booking(db, booking)
