"""TravelGroup schema."""

from pydantic import BaseModel

from app.schemas.base import ORMSchema


class TravelGroupCreate(BaseModel):
    """Fields required to create a travel group."""

    name: str
    guide_id: int


class TravelGroupUpdate(BaseModel):
    """Fields allowed when updating a travel group."""

    name: str | None = None
    guide_id: int | None = None


class TravelGroupRead(ORMSchema):
    """TravelGroup fields returned by the API."""

    id: int
    name: str
    guide_id: int
