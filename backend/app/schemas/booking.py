"""Booking schema."""

from datetime import date

from pydantic import BaseModel

from app.models.status import BookingStatus
from app.schemas.base import ORMSchema


class BookingCreate(BaseModel):
    """Fields required to create a booking between a tourist and a package.

    Both ids must refer to existing resources: the service validates the tourist
    and the package before persisting the association. The booking date is the
    date on which the reservation was made (per the MERX BookingDate attribute).

    Additional fields describe the proposed itinerary and the current lifecycle
    status of the booking, which defaults to ``pending``.
    """

    tourist_id: int
    package_id: int
    booking_date: date
    proposed_date: date | None = None
    itinerary_id: int | None = None
    rejection_reason: str | None = None
    status: BookingStatus = BookingStatus.PENDING


class BookingUpdate(BaseModel):
    """Mutable fields of an existing booking.

    Every field is optional so callers can patch only the attributes that
    change. When the status is set to ``rejected`` a non-empty rejection reason
    is required.
    """

    booking_date: date | None = None
    proposed_date: date | None = None
    itinerary_id: int | None = None
    rejection_reason: str | None = None
    status: BookingStatus | None = None


class BookingRead(ORMSchema):
    """Booking fields returned by the API."""

    tourist_id: int
    package_id: int
    booking_date: date | None
    proposed_date: date | None
    itinerary_id: int | None
    rejection_reason: str | None
    status: BookingStatus
