"""Itinerary schema."""

from datetime import date
from typing import Literal, Self

from pydantic import BaseModel, Field, model_validator

from app.models.status import ItineraryStatus
from app.schemas.base import ORMSchema
from app.schemas.itinerary_composition import PlannedActivity
from app.schemas.proportion_category import ProportionCategoryParam
from app.schemas.proportion_type import ProportionTypeParam


class ItineraryCreate(BaseModel):
    """Fields required to create an itinerary; it is always born pending."""

    creation_date: date
    activity_count: int
    package_id: int
    guide_id: int


class ItineraryUpdate(BaseModel):
    """Fields allowed when updating an itinerary."""

    creation_date: date | None = None
    status: ItineraryStatus | None = None
    activity_count: int | None = None


class ItineraryRead(ORMSchema):
    """Itinerary fields returned by the API."""

    id: int
    creation_date: date
    status: ItineraryStatus
    activity_count: int
    package_id: int
    guide_id: int


class ItineraryGenerate(BaseModel):
    """Parameters to generate an itinerary from the candidate activities chosen by a guide."""

    package_id: int
    days: int = Field(ge=1)
    activity_count: int = Field(ge=1)
    candidate_ids: list[int] = Field(min_length=1)
    proportion_types: list[ProportionTypeParam] = Field(default_factory=list)
    proportion_categories: list[ProportionCategoryParam] = Field(default_factory=list)

    @model_validator(mode="after")
    def check_consistency(self) -> Self:
        """Reject repeated entries, proportions over 100 % and more days than activities."""
        codes = [p.activity_type_code for p in self.proportion_types]
        category_ids = [p.category_id for p in self.proportion_categories]
        if any(len(set(ids)) != len(ids) for ids in (self.candidate_ids, codes, category_ids)):
            raise ValueError("candidates and proportions must not repeat")
        if any(
            sum(p.value for p in proportions) > 100
            for proportions in (self.proportion_types, self.proportion_categories)
        ):
            raise ValueError("proportions must not add up to more than 100")
        if self.days > self.activity_count:
            raise ValueError("days must not exceed activity_count")
        return self


class BalanceCriterion(BaseModel):
    """Balance criterion of a generated itinerary: what was asked, what was got and if it holds."""

    key: Literal["activity_count", "type_proportion", "category_coverage"]
    subject: str | None = None
    target: int
    actual: int
    met: bool


class ItineraryPlan(BaseModel):
    """Preview of a generated itinerary, not saved yet."""

    compositions: list[PlannedActivity]
    criteria: list[BalanceCriterion]


class ItineraryGeneratedRead(ItineraryRead, ItineraryPlan):
    """Saved generated itinerary with its planned activities and balance criteria."""
