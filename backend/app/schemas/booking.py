"""Booking schema."""

from pydantic import BaseModel

from app.schemas.base import ORMSchema


class BookingCreate(BaseModel):
    """Fields required to create a booking between a tourist and a package.

    Both ids must refer to existing resources: the service validates the tourist
    and the package before persisting the association.
    """

    tourist_id: int
    package_id: int


class BookingRead(ORMSchema):
    """Booking fields returned by the API."""

    tourist_id: int
    package_id: int
