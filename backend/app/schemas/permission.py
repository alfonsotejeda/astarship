"""Permission schema."""

from pydantic import BaseModel, Field

from app.schemas.base import ORMSchema


class PermissionCreate(BaseModel):
    """Create a new permission."""

    name: str = Field(min_length=1, max_length=255)


class PermissionRead(ORMSchema):
    """Permission fields returned by the API."""

    name: str
