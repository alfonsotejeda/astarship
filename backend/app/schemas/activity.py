"""Activity schema."""

from datetime import date, datetime

from pydantic import AliasPath, BaseModel, Field, field_validator

from app.models.status import ReviewStatus, ValidationResult
from app.schemas.base import ORMSchema


class ActivityCreate(BaseModel):
    """Fields required to create an activity; the author is the guide in the token.

    It is always born pending.
    """

    name: str
    effort_level: int
    duration: int = Field(ge=1)
    activity_type_code: str
    category_id: int
    attraction_id: int


class ActivityUpdate(BaseModel):
    """Fields the author may change; neither the author nor the status are edited here."""

    name: str | None = None
    effort_level: int | None = None
    duration: int | None = Field(default=None, ge=1)
    activity_type_code: str | None = None
    category_id: int | None = None
    attraction_id: int | None = None

    @field_validator(
        "name",
        "effort_level",
        "duration",
        "activity_type_code",
        "category_id",
        "attraction_id",
    )
    @classmethod
    def reject_null(cls, value):
        """Optional fields may be omitted, but not sent as null."""
        if value is None:
            raise ValueError("This field cannot be null")
        return value


class LastValidation(ORMSchema):
    """The administrator's latest review of an activity, with the reviewer's name."""

    reviewer_name: str = Field(validation_alias=AliasPath("admin", "user", "name"))
    validation_date: datetime
    result: ValidationResult
    observations: str | None


class ActivityRead(ORMSchema):
    """Activity fields returned by the API, with the names the screens show next to the ids."""

    id: int
    name: str
    effort_level: int
    duration: int
    status: ReviewStatus
    creation_date: date
    activity_type_code: str
    category_id: int
    guide_id: int
    attraction_id: int
    attraction_name: str = Field(validation_alias=AliasPath("attraction", "name"))
    author_name: str = Field(validation_alias=AliasPath("guide", "user", "name"))
    uses: int = 0  # times in approved itineraries, still to be counted (RC-2, #56)
    last_validation: LastValidation | None = None
