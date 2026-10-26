"""Booking service."""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.models.package import Package
from app.models.user.tourist import Tourist
from app.schemas.booking import BookingCreate


def list_bookings(db: Session, tourist_id: int | None = None) -> list[Booking]:
    """Return all bookings, optionally filtered by tourist id."""
    statement = select(Booking)
    if tourist_id is not None:
        statement = statement.where(Booking.tourist_id == tourist_id)
    return list(db.scalars(statement))


def get_booking(db: Session, tourist_id: int, package_id: int) -> Booking | None:
    """Return a booking by its tourist and package ids, or None if it doesn't exist."""
    return db.get(Booking, (tourist_id, package_id))


def create_booking(db: Session, data: BookingCreate) -> Booking:
    """Create and persist a new booking between an existing tourist and a package.

    Args:
        db: Database session.
        data: Creation payload with tourist_id and package_id.

    Returns:
        The persisted booking.

    Raises:
        ValueError: If the tourist or the package does not exist, or if a booking
            for the same pair already exists.
    """
    tourist = db.get(Tourist, data.tourist_id)
    if tourist is None:
        raise ValueError("Tourist not found")
    package = db.get(Package, data.package_id)
    if package is None:
        raise ValueError("Package not found")
    if get_booking(db, data.tourist_id, data.package_id) is not None:
        raise ValueError("Booking for this tourist and package already exists")
    booking = Booking(tourist=tourist, package=package)
    db.add(booking)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("Booking for this tourist and package already exists")
    db.refresh(booking)
    return booking


def delete_booking(db: Session, booking: Booking) -> None:
    """Delete a booking."""
    db.delete(booking)
    db.commit()


def get_tourists_for_package(db: Session, package_id: int) -> list[Tourist]:
    """Return all tourists booked into a package."""
    statement = (
        select(Tourist)
        .join(Booking, Tourist.id == Booking.tourist_id)
        .where(Booking.package_id == package_id)
    )
    return list(db.scalars(statement))


def get_packages_for_tourist(db: Session, tourist_id: int) -> list[Package]:
    """Return all packages a tourist is booked into."""
    statement = (
        select(Package)
        .join(Booking, Package.id == Booking.package_id)
        .where(Booking.tourist_id == tourist_id)
    )
    return list(db.scalars(statement))
