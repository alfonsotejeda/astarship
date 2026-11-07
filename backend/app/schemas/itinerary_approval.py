"""ItineraryApproval schema."""

from datetime import datetime
from typing import Self

from pydantic import BaseModel, model_validator

from app.models.status import ApprovalResult
from app.schemas.base import ORMSchema


class ItineraryApprovalCreate(BaseModel):
    """Fields required to approve or reject an itinerary; a rejection needs observations."""

    manager_id: int
    result: ApprovalResult
    observations: str | None = None

    @model_validator(mode="after")
    def require_observations_on_rejection(self) -> Self:
        """Reject a rejection that doesn't explain why in the observations."""
        if self.result is ApprovalResult.REJECTED and not self.observations:
            raise ValueError("observations are required when the itinerary is rejected")
        return self


class ItineraryApprovalRead(ORMSchema):
    """Itinerary approval fields returned by the API."""

    itinerary_id: int
    manager_id: int
    approval_date: datetime
    result: ApprovalResult
    observations: str | None
