"""ItineraryComposition schema."""

from datetime import time

from pydantic import BaseModel, Field

from app.schemas.base import ORMSchema


class ItineraryCompositionCreate(BaseModel):
    """Fields required to add an activity to an itinerary."""

    order: int = Field(ge=1)
    day: int = Field(ge=1)
    start_time: time


class ItineraryCompositionUpdate(BaseModel):
    """Fields allowed when rescheduling an activity within an itinerary."""

    order: int | None = Field(default=None, ge=1)
    day: int | None = Field(default=None, ge=1)
    start_time: time | None = None


class ItineraryCompositionRead(ORMSchema):
    """ItineraryComposition fields returned by the API."""

    itinerary_id: int
    activity_id: int
    order: int
    day: int
    start_time: time
