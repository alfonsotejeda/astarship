"""Package schema."""

from pydantic import BaseModel

from app.schemas.base import ORMSchema


class PackageCreate(BaseModel):
    """Fields required to create a package.

    A package is never born validated: `validated` only changes through an update.
    """

    name: str
    destination: str


class PackageUpdate(BaseModel):
    """Fields allowed when updating a package."""

    name: str | None = None
    destination: str | None = None
    validated: bool | None = None


class PackageRead(ORMSchema):
    """Package fields returned by the API."""

    id: int
    name: str
    destination: str
    validated: bool
