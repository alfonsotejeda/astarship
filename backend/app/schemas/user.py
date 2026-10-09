"""User schema."""

from pydantic import BaseModel

from app.schemas.base import ORMSchema


class UserCreate(BaseModel):
    """Fields required to create a user."""

    name: str
    role: str
    email: str
    password: str


class UserUpdate(BaseModel):
    """Fields allowed when updating a user."""

    name: str | None = None
    role: str | None = None
    email: str | None = None
    password: str | None = None


class UserRead(ORMSchema):
    """User fields returned by the API."""

    id: int
    name: str
    role: str
    email: str
