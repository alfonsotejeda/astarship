"""Activity schema."""

from datetime import date

from pydantic import BaseModel, field_validator

from app.models.status import ReviewStatus
from app.schemas.base import ORMSchema


class ActivityCreate(BaseModel):
    """Fields required to create an activity; it is always born pending."""

    name: str
    effort_level: int
    activity_type_code: str
    category_id: int
    guide_id: int


#   attraction_id: int


class ActivityUpdate(BaseModel):
    """Fields allowed when updating an activity."""

    name: str | None = None
    effort_level: int | None = None
    status: ReviewStatus | None = None
    activity_type_code: str | None = None
    category_id: int | None = None
    guide_id: int | None = None
    #   attraction_id: int | None = None

    @field_validator(
        "name", "effort_level", "status", "activity_type_code", "category_id", "guide_id"
    )
    @classmethod
    def reject_null(cls, value):
        """Optional fields may be omitted, but not sent as null."""
        if value is None:
            raise ValueError("This field cannot be null")
        return value


class ActivityRead(ORMSchema):
    """Activity fields returned by the API."""

    id: int
    name: str
    effort_level: int
    status: ReviewStatus
    creation_date: date
    activity_type_code: str
    category_id: int
    guide_id: int


#   attraction_id: int | None = None
