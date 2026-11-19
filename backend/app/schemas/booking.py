"""Booking schema."""

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

from app.models.status import BookingStatus
from app.schemas.base import ORMSchema


class BookingCreate(BaseModel):
    """Fields required to create a booking between a tourist and a package.

    Both ids must refer to existing resources: the service validates the tourist
    and the package before persisting the association. The booking date is the
    date on which the reservation was made (per the MERX BookingDate attribute).

    Additional fields describe the requested start date, the preferred itinerary
    and the assigned itinerary, plus the current lifecycle status of the booking,
    which defaults to ``pending``.
    """

    tourist_id: int
    package_id: int
    booking_date: date
    requested_start_date: date | None = None
    preferred_itinerary_id: int | None = None
    itinerary_id: int | None = None
    rejection_reason: str | None = None
    status: BookingStatus = BookingStatus.PENDING


class BookingIn(BaseModel):
    """Payload of POST /packages/{package_id}/bookings.

    A tourist sends ``requested_start_date`` (and optionally a
    ``preferred_itinerary_id``); an admin sends ``tourist_id`` to enrol another
    user. ``tourist_id`` is optional because tourists book for themselves (the
    id comes from the token).
    """

    model_config = {"extra": "forbid"}

    tourist_id: int | None = None
    requested_start_date: date | None = None
    preferred_itinerary_id: int | None = None


class BookingPatch(BaseModel):
    """Payload of PATCH /packages/{package_id}/bookings/{tourist_id}.

    Only ``cancelled`` and ``rejected`` are admitted. A rejection requires a
    non-empty reason; a cancellation does not.
    """

    model_config = {"extra": "forbid"}

    status: Literal[BookingStatus.CANCELLED, BookingStatus.REJECTED] = Field(
        description="Only cancelled or rejected are admitted."
    )
    rejection_reason: str | None = None


class BookingUpdate(BaseModel):
    """Mutable fields of an existing booking.

    Every field is optional so callers can patch only the attributes that
    change. When the status is set to ``rejected`` a non-empty rejection reason
    is required.
    """

    booking_date: date | None = None
    requested_start_date: date | None = None
    preferred_itinerary_id: int | None = None
    itinerary_id: int | None = None
    rejection_reason: str | None = None
    status: BookingStatus | None = None


class BookingRead(ORMSchema):
    """Booking fields returned by the API."""

    tourist_id: int
    package_id: int
    booking_date: date | None
    requested_start_date: date | None
    preferred_itinerary_id: int | None
    resolved_date: date | None
    itinerary_id: int | None
    rejection_reason: str | None
    status: BookingStatus
    tourist_name: str
    package_name: str
