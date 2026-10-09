"""Itinerary schema."""

from datetime import date

from pydantic import BaseModel

from app.schemas.base import ORMSchema


class ItineraryCreate(BaseModel):
    """Fields required to create an itinerary."""

    creation_date: date
    activity_count: int
    validated: bool
    package_id: int | None = None
    creator_id: int | None = None


class ItineraryUpdate(BaseModel):
    """Fields allowed when updating an itinerary."""

    creation_date: date | None = None
    activity_count: int | None = None
    validated: bool | None = None
    package_id: int | None = None
    creator_id: int | None = None


class ItineraryRead(ORMSchema):
    """Itinerary fields returned by the API."""

    id: int
    creation_date: date
    activity_count: int
    validated: bool
    package_id: int | None
    creator_id: int | None
