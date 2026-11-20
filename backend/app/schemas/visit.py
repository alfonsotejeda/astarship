"""Visit schema."""

from datetime import date
from typing import Literal, Self

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.base import ORMSchema

VisitStatus = Literal["done", "skipped"]


class VisitCreated(BaseModel):
    """Schema for a created visit."""

    itinerary_id: int
    tourist_id: int
    activity_id: int
    assignment_date: date
    status: VisitStatus
    comment: str | None = Field(default=None, max_length=255)
    rating: int | None = Field(default=None, ge=1, le=5)

    @model_validator(mode="after")
    def rating_required_id_done(self) -> Self:
        """Require a rating when the visit status is done."""
        if self.status == "done" and self.rating is None:
            raise ValueError("A done visit needs a rating.")
        return self


class VisitUpdate(BaseModel):
    """Schema for updating a visit."""

    status: VisitStatus | None = None
    comment: str | None = Field(default=None, max_length=255)
    rating: int | None = Field(default=None, ge=1, le=5)

    @field_validator("status")
    @classmethod
    def reject_null(cls, value: VisitStatus | None) -> VisitStatus | None:
        """Reject null values for the visit status during updates."""
        if value is None:
            raise ValueError("status cannot be null")
        return value


class VisitRead(ORMSchema):
    """Visit returned by the API."""

    itinerary_id: int
    tourist_id: int
    assignment_date: date
    activity_id: int
    status: str
    comment: str | None
    rating: int | None
