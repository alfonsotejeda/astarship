"""Permission schema."""

from pydantic import BaseModel

from app.schemas.base import ORMSchema


class PermissionCreate(BaseModel):
    """Create a new permission."""

    name: str


class PermissionRead(ORMSchema):
    """Permission fields returned by the API."""

    name: str
