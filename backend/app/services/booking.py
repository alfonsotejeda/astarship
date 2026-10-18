"""Booking service."""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.models.package import Package
from app.models.user import User
from app.schemas.booking import BookingCreate


def list_bookings(db: Session) -> list[Booking]:
    """Return all bookings."""
    return list(db.scalars(select(Booking)))


def get_booking(db: Session, user_id: int, package_id: int) -> Booking | None:
    """Return a booking by its user and package ids, or None if it doesn't exist."""
    return db.get(Booking, (user_id, package_id))


def create_booking(db: Session, data: BookingCreate) -> Booking:
    """Create and persist a new booking between an existing user and package.

    Args:
        db: Database session.
        data: Creation payload with user_id and package_id.

    Returns:
        The persisted booking.

    Raises:
        ValueError: If the user or package does not exist, or if a booking
            for the same pair already exists.
    """
    user = db.get(User, data.user_id)
    if user is None:
        raise ValueError("User not found")
    package = db.get(Package, data.package_id)
    if package is None:
        raise ValueError("Package not found")
    if get_booking(db, data.user_id, data.package_id) is not None:
        raise ValueError("Booking for this user and package already exists")
    booking = Booking(user_id=data.user_id, package_id=data.package_id)
    db.add(booking)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("Booking for this user and package already exists")
    db.refresh(booking)
    return booking


def delete_booking(db: Session, booking: Booking) -> None:
    """Delete a booking."""
    db.delete(booking)
    db.commit()


def get_users_for_package(db: Session, package_id: int) -> list[User]:
    """Return all users booked into a package."""
    statement = (
        select(User)
        .join(Booking, User.id == Booking.user_id)
        .where(Booking.package_id == package_id)
    )
    return list(db.scalars(statement))


def get_packages_for_user(db: Session, user_id: int) -> list[Package]:
    """Return all packages a user is booked into."""
    statement = (
        select(Package)
        .join(Booking, Package.id == Booking.package_id)
        .where(Booking.user_id == user_id)
    )
    return list(db.scalars(statement))
