"""Booking service."""

from datetime import date

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models.booking import Booking
from app.models.itinerary import Itinerary
from app.models.package import Package
from app.models.status import BookingStatus
from app.models.user.tourist import Tourist
from app.schemas.booking import BookingCreate, BookingUpdate


def list_bookings(db: Session, tourist_id: int | None = None) -> list[Booking]:
    """Return all bookings, optionally filtered by tourist id."""
    statement = select(Booking).options(
        joinedload(Booking.tourist).joinedload(Tourist.user),
        joinedload(Booking.package),
    )
    if tourist_id is not None:
        statement = statement.where(Booking.tourist_id == tourist_id)
    return list(db.scalars(statement))


def get_booking(db: Session, tourist_id: int, package_id: int) -> Booking | None:
    """Return a booking by its tourist and package ids, or None if it doesn't exist."""
    statement = (
        select(Booking)
        .where(Booking.tourist_id == tourist_id, Booking.package_id == package_id)
        .options(
            joinedload(Booking.tourist).joinedload(Tourist.user),
            joinedload(Booking.package),
        )
    )
    return db.scalars(statement).first()


def create_booking(
    db: Session,
    data: BookingCreate,
    *,
    current_user_id: int | None = None,
    is_admin: bool = False,
) -> Booking:
    """Create (or re-reserve) a booking between a tourist and a package.

    ``data`` carries the tourist/package ids and optional fields. A
    ``pending`` or ``assigned`` duplicate raises ``ValueError``. A
    ``cancelled``/``rejected`` row is reused in place: it is reset to
    ``pending`` with cleared dates/reason.
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

    existing = get_booking(db, data.tourist_id, data.package_id)
    if existing is not None:
        if existing.status in (BookingStatus.PENDING, BookingStatus.ASSIGNED):
            raise ValueError("Booking for this tourist and package already exists")
        # Re-reserve in place: reset the cancelled/rejected row to pending.
        existing.status = BookingStatus.PENDING
        existing.requested_start_date = data.requested_start_date
        existing.preferred_itinerary_id = data.preferred_itinerary_id
        existing.itinerary_id = data.itinerary_id
        existing.resolved_date = None
        existing.rejection_reason = data.rejection_reason
        existing.booking_date = data.booking_date
        db.add(existing)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise ValueError("Booking for this tourist and package already exists")
        db.refresh(existing)
        return existing

    booking = Booking(
        tourist=tourist,
        package=package,
        booking_date=data.booking_date,
        requested_start_date=data.requested_start_date,
        preferred_itinerary_id=data.preferred_itinerary_id,
        itinerary_id=data.itinerary_id,
        rejection_reason=data.rejection_reason,
        status=data.status,
    )
    _apply_resolved_date(booking, data.status)
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

    _apply_resolved_date(booking, new_status)

    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


def _apply_resolved_date(booking: Booking, status: BookingStatus) -> None:
    """Fill or clear ``resolved_date`` depending on the resulting status."""
    if status in (BookingStatus.REJECTED, BookingStatus.CANCELLED):
        booking.resolved_date = date.today()
    elif status in (BookingStatus.PENDING, BookingStatus.ASSIGNED):
        booking.resolved_date = None


def delete_booking(db: Session, booking: Booking) -> None:
    """Delete a booking.

    Raises:
        ValueError: if the booking already has an assigned itinerary.
    """
    if booking.itinerary_id is not None:
        raise ValueError("Cannot delete a booking with an assigned itinerary")
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
