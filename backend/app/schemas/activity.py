"""Activity schema."""

from pydantic import BaseModel

from app.schemas.base import ORMSchema


class ActivityCreate(BaseModel):
    """Fields required to create an activity."""

    name: str
    effort_level: int
    activity_type_code: str | None = None
    category_id: int | None = None
    user_id: int | None = None


class ActivityUpdate(BaseModel):
    """Fields allowed when updating an activity."""

    name: str | None = None
    effort_level: int | None = None
    activity_type_code: str | None = None
    category_id: int | None = None
    user_id: int | None = None


class ActivityRead(ORMSchema):
    """Activity fields returned by the API."""

    id: int
    name: str
    effort_level: int
    activity_type_code: str | None
    category_id: int | None
    user_id: int | None
