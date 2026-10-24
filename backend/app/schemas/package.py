"""Package schema."""

from datetime import date

from pydantic import BaseModel

from app.models.status import ReviewStatus
from app.schemas.base import ORMSchema


class PackageCreate(BaseModel):
    """Fields required to create a package.

    A package is always born pending: `status` only changes through an update.
    """

    name: str
    destination: str


class PackageUpdate(BaseModel):
    """Fields allowed when updating a package."""

    name: str | None = None
    destination: str | None = None
    status: ReviewStatus | None = None


class PackageRead(ORMSchema):
    """Package fields returned by the API."""

    id: int
    name: str
    destination: str
    status: ReviewStatus
    creation_date: date
