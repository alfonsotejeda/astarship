"""ModificationRequest schema."""

from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.status import ModificationRequestStatus
from app.schemas.base import ORMSchema


class ModificationRequestCreate(BaseModel):
    """Fields a tourist sends to request a change; the guide defaults to its travel group one."""

    description: str = Field(min_length=1)
    guide_id: int | None = None
    assignment_date: date
    request_date: datetime = Field(default_factory=datetime.now)


class ModificationRequestUpdate(BaseModel):
    """Fields allowed when handling a modification request."""

    description: str | None = Field(default=None, min_length=1)
    status: ModificationRequestStatus | None = None
    result: str | None = None


class ModificationRequestRead(ORMSchema):
    """ModificationRequest fields returned by the API."""

    itinerary_id: int
    tourist_id: int
    guide_id: int
    assignment_date: date
    description: str
    status: ModificationRequestStatus
    result: str | None
    request_date: datetime
