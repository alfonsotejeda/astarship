"""Visit schemas."""

from typing import Self

from pydantic import BaseModel, Field, model_validator

from app.models.status import VisitStatus
from app.schemas.base import ORMSchema


class VisitCreated(BaseModel):
    """Fields required to register a visit; a done visit needs a rating."""

    itinerary_id: int
    tourist_id: int
    activity_id: int
    status: VisitStatus
    comment: str | None = Field(default=None, max_length=255)
    rating: int | None = Field(default=None, ge=1, le=5)

    @model_validator(mode="after")
    def require_rating_when_done(self) -> Self:
        """Reject a done visit without a rating."""
        if self.status is VisitStatus.DONE and self.rating is None:
            raise ValueError("A done visit needs a rating.")
        return self


class VisitUpdate(BaseModel):
    """Fields allowed when updating a visit."""

    status: VisitStatus | None = None
    comment: str | None = Field(default=None, max_length=255)
    rating: int | None = Field(default=None, ge=1, le=5)


class VisitRead(ORMSchema):
    """Visit fields returned by the API."""

    itinerary_id: int
    tourist_id: int
    activity_id: int
    status: VisitStatus
    comment: str | None
    rating: int | None
