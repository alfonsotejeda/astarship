"""Itinerary_validation schema."""

from datetime import datetime

from pydantic import BaseModel

from app.schemas.base import ORMSchema


class ItineraryValidationCreate(BaseModel):
    """Data needed to validate an itinerary."""

    guide_id: int
    result: bool
    observations: str | None


class ItineraryValidationRead(ORMSchema):
    """Itinerary validation as returned by the API."""

    itinerary_id: int
    guide_id: int
    validation_date: datetime
    result: bool
    observations: str | None = None
