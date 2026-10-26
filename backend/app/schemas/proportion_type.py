"""ProportionType schema."""

from pydantic import BaseModel, Field

from app.schemas.base import ORMSchema


class ProportionTypeCreate(BaseModel):
    """Fields required to assign an activity type's proportion to an itinerary."""

    value: int = Field(ge=0, le=100)


class ProportionTypeUpdate(BaseModel):
    """Fields allowed when updating an activity type's proportion on an itinerary."""

    value: int = Field(ge=0, le=100)


class ProportionTypeRead(ORMSchema):
    """ProportionType fields returned by the API."""

    itinerary_id: int
    activity_type_code: str
    value: int
