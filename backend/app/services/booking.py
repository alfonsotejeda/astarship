"""Booking service."""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.models.itinerary import Itinerary
from app.models.package import Package
from app.models.status import BookingStatus
from app.models.user.tourist import Tourist
from app.schemas.booking import BookingCreate, BookingUpdate


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
        ValueError: If the tourist, the package or the itinerary does not exist,
            or if a booking for the same pair already exists.
    """
    tourist = db.get(Tourist, data.tourist_id)
    if tourist is None:
        raise ValueError("Tourist not found")
    package = db.get(Package, data.package_id)
    if package is None:
        raise ValueError("Package not found")
    if data.itinerary_id is not None:
        itinerary = db.get(Itinerary, data.itinerary_id)
        if itinerary is None:
            raise ValueError("Itinerary not found")
    if get_booking(db, data.tourist_id, data.package_id) is not None:
        raise ValueError("Booking for this tourist and package already exists")
    booking = Booking(
        tourist=tourist,
        package=package,
        booking_date=data.booking_date,
        proposed_date=data.proposed_date,
        itinerary_id=data.itinerary_id,
        rejection_reason=data.rejection_reason,
        status=data.status,
    )
    db.add(booking)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("Booking for this tourist and package already exists")
    db.refresh(booking)
    return booking


def update_booking(db: Session, booking: Booking, data: BookingUpdate) -> Booking:
    """Update mutable fields of an existing booking.

    Only the fields explicitly provided in ``data`` are changed; the rest are
    left untouched. When the resulting status is ``rejected`` a non-empty
    rejection reason must be present (either sent in the request or already
    stored on the booking).

    Args:
        db: Database session.
        booking: The booking row to update.
        data: Partial update payload.

    Returns:
        The updated booking.

    Raises:
        ValueError: If the itinerary does not exist, or if the booking is
            rejected without a reason.
    """
    update_data = data.model_dump(exclude_unset=True)

    if "itinerary_id" in update_data and update_data["itinerary_id"] is not None:
        itinerary = db.get(Itinerary, update_data["itinerary_id"])
        if itinerary is None:
            raise ValueError("Itinerary not found")

    new_status = update_data.get("status", booking.status)
    new_reason = update_data.get("rejection_reason", booking.rejection_reason)
    if new_status is BookingStatus.REJECTED and not new_reason:
        raise ValueError("Rejection reason is required when status is rejected")

    for field, value in update_data.items():
        setattr(booking, field, value)

    db.add(booking)
    db.commit()
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
