"""ProportionCategory schema."""

from pydantic import BaseModel, Field

from app.schemas.base import ORMSchema


class ProportionCategoryCreate(BaseModel):
    """Fields required to assign a category's proportion to an itinerary."""

    value: int = Field(ge=0, le=100)


class ProportionCategoryParam(ProportionCategoryCreate):
    """Category proportion requested when generating an itinerary."""

    category_id: int


class ProportionCategoryUpdate(BaseModel):
    """Fields allowed when updating a category's proportion on an itinerary."""

    value: int = Field(ge=0, le=100)


class ProportionCategoryRead(ORMSchema):
    """ProportionCategory fields returned by the API."""

    itinerary_id: int
    category_id: int
    value: int
