"""ActivityType schema."""

from pydantic import BaseModel

from app.schemas.base import ORMSchema


class ActivityTypeCreate(BaseModel):
    """Fields required to create an activity type."""

    code: str
    name: str


class ActivityTypeUpdate(BaseModel):
    """Fields allowed when updating an activity type."""

    name: str | None = None


class ActivityTypeRead(ORMSchema):
    """ActivityType fields returned by the API."""

    code: str
    name: str
