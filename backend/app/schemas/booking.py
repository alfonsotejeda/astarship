"""Booking schema."""

from datetime import date

from pydantic import BaseModel

from app.schemas.base import ORMSchema


class BookingCreate(BaseModel):
    """Fields required to create a booking between a tourist and a package.

    Both ids must refer to existing resources: the service validates the tourist
    and the package before persisting the association. The booking date is the
    date on which the reservation was made (per the MERX BookingDate attribute).
    """

    tourist_id: int
    package_id: int
    booking_date: date


class BookingRead(ORMSchema):
    """Booking fields returned by the API."""

    tourist_id: int
    package_id: int
    booking_date: date | None
