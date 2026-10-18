"""Booking routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.schemas.booking import BookingCreate, BookingRead
from app.services import booking as booking_service
from app.services import package as package_service
from app.services import user as user_service

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _get_user_or_404(db: Session, user_id: int) -> User:
    """Return the user or raise a 404."""
    user = user_service.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def _get_package_or_404(db: Session, package_id: int):
    """Return the package or raise a 404."""
    package = package_service.get_package(db, package_id)
    if package is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Package not found"
        )
    return package


def _get_booking_or_404(db: Session, user_id: int, package_id: int):
    """Return the booking or raise a 404."""
    booking = booking_service.get_booking(db, user_id, package_id)
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found"
        )
    return booking


def _raise_conflict(db: Session, exc: Exception) -> None:
    """Raise a 409 for a duplicate (user, package) pair.

    Rolls back only when the flush failed (IntegrityError); a ValueError
    from the pre-check leaves no pending state in the session.
    """
    if isinstance(exc, IntegrityError):
        db.rollback()
    conflict_detail = "Booking for this user and package already exists"
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=conflict_detail) from exc


@router.get("", response_model=list[BookingRead])
def list_bookings(db: Session = Depends(get_db)) -> list[BookingRead]:
    """List all bookings."""
    return booking_service.list_bookings(db)


@router.get("/{user_id}/{package_id}", response_model=BookingRead)
def get_booking(user_id: int, package_id: int, db: Session = Depends(get_db)):
    """Get a single booking by its user and package ids."""
    return _get_booking_or_404(db, user_id, package_id)


@router.post("", response_model=BookingRead, status_code=status.HTTP_201_CREATED)
def create_booking(data: BookingCreate, db: Session = Depends(get_db)) -> BookingRead:
    """Create a booking between an existing user and an existing package."""
    _get_user_or_404(db, data.user_id)
    _get_package_or_404(db, data.package_id)
    try:
        return booking_service.create_booking(db, data)
    except (ValueError, IntegrityError) as exc:
        _raise_conflict(db, exc)


@router.delete("/{user_id}/{package_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_booking(user_id: int, package_id: int, db: Session = Depends(get_db)) -> None:
    """Delete a booking by its user and package ids."""
    booking = _get_booking_or_404(db, user_id, package_id)
    booking_service.delete_booking(db, booking)
