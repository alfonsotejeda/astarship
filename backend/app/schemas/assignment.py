"""Assignment schema."""

from datetime import date

from pydantic import BaseModel, Field

from app.models.status import AssignmentStatus
from app.schemas.base import ORMSchema


class AssignmentCreate(BaseModel):
    """Fields required to assign an itinerary to a tourist; it is always born assigned."""

    admin_id: int
    assignment_date: date = Field(default_factory=date.today)


class AssignmentUpdate(BaseModel):
    """Fields allowed when updating an assignment."""

    status: AssignmentStatus | None = None


class AssignmentRead(ORMSchema):
    """Assignment fields returned by the API."""

    itinerary_id: int
    tourist_id: int
    assignment_date: date
    status: AssignmentStatus
    admin_id: int
