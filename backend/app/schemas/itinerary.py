"""Itinerary schema."""

from datetime import date

from pydantic import BaseModel

from app.models.status import ItineraryStatus
from app.schemas.base import ORMSchema


class ItineraryCreate(BaseModel):
    """Fields required to create an itinerary; it is always born pending."""

    creation_date: date
    activity_count: int
    package_id: int
    guide_id: int


class ItineraryUpdate(BaseModel):
    """Fields allowed when updating an itinerary."""

    creation_date: date | None = None
    status: ItineraryStatus | None = None
    activity_count: int | None = None


class ItineraryRead(ORMSchema):
    """Itinerary fields returned by the API."""

    id: int
    creation_date: date
    status: ItineraryStatus
    activity_count: int
    package_id: int
    guide_id: int
