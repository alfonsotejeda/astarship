"""PackageValidation schema."""

from datetime import datetime

from pydantic import BaseModel, model_validator

from app.models.status import ValidationResult
from app.schemas.base import ORMSchema


class PackageValidationCreate(BaseModel):
    """Fields required to validate a package; the date and the manager are set by the server.

    `observations` is optional in the payload, but it becomes mandatory when the result is
    rejected (both at schema level and through a database CHECK constraint).
    """

    result: ValidationResult
    observations: str | None = None

    @model_validator(mode="after")
    def _observations_required_when_rejected(self) -> "PackageValidationCreate":
        if self.result is ValidationResult.REJECTED and (
            not self.observations or not self.observations.strip()
        ):
            raise ValueError("observations is required when result is rejected")
        return self


class PackageValidationRead(ORMSchema):
    """PackageValidation fields returned by the API."""

    reviewer_id: int
    reviewer_name: str
    validation_date: datetime
    result: ValidationResult
    observations: str | None
