"""ActivityValidation schema."""

from datetime import datetime

from pydantic import BaseModel

from app.models.status import ValidationResult
from app.schemas.base import ORMSchema


class ActivityValidationCreate(BaseModel):
    """Fields required to validate an activity; the date is set by the server."""

    admin_id: int
    result: ValidationResult
    observations: str | None = None


class ActivityValidationRead(ORMSchema):
    """ActivityValidation fields returned by the API."""

    activity_id: int
    admin_id: int
    validation_date: datetime
    result: ValidationResult
    observations: str | None
