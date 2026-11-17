"""ModificationRequest schema."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.status import ModificationRequestStatus
from app.schemas.base import ORMSchema


class ModificationRequestCreate(BaseModel):
    """Fields a tourist sends to request a change; the guide defaults to its travel group one."""

    description: str = Field(min_length=1)
    guide_id: int | None = None
    request_date: datetime | None = None


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
    request_date: datetime
    description: str
    status: ModificationRequestStatus
    result: str | None
