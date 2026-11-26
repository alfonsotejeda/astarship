"""Report schemas."""

from datetime import date
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from app.models.status import ItineraryStatus


class SortOrder(StrEnum):
    """Direction a report is sorted in."""

    ASC = "asc"
    DESC = "desc"


class Rc1SortColumn(StrEnum):
    """Columns the RC-1 table can be sorted by."""

    ID = "id"
    PACKAGE = "package"
    CREATOR = "creator"
    CREATION_DATE = "creation_date"
    STATUS = "status"
    ACTIVITY_COUNT = "activity_count"


class Rc1TypeParam(BaseModel):
    """Activity type proportion used to generate an itinerary."""

    activity_type_code: str
    activity_type_name: str
    value: int


class Rc1CategoryParam(BaseModel):
    """Category proportion used to generate an itinerary."""

    category_id: int
    category_name: str
    value: int


class Rc1Row(BaseModel):
    """Generated itinerary with its creator, creation date and generation parameters."""

    id: int
    package_id: int
    package_name: str
    guide_id: int
    creator: str
    creation_date: date
    status: ItineraryStatus
    activity_count: int
    proportion_types: list[Rc1TypeParam]
    proportion_categories: list[Rc1CategoryParam]


class Rc1ChartPoint(BaseModel):
    """Number of itineraries a guide created that are in a given status."""

    guide_id: int
    creator: str
    status: ItineraryStatus
    count: int


class Rc1Report(BaseModel):
    """RC-1 table rows and the creator by status chart data."""

    rows: list[Rc1Row]
    chart: list[Rc1ChartPoint]


class EffortLevel(StrEnum):
    """Effort band of an activity, derived from its numeric effort level."""

    BAJO = "bajo"
    MEDIO = "medio"
    ALTO = "alto"


class Rc6ScatterPoint(BaseModel):
    """A package's average rating at one effort level, as a point of the dispersion."""

    package_id: int
    package_name: str
    effort: EffortLevel
    effort_value: int
    rating: float
    visits: int
    rated: int


class Rc6Trend(BaseModel):
    """Linear trend of the effort ↔ rating dispersion, with its Pearson coefficient."""

    model_config = ConfigDict(populate_by_name=True)

    slope: float
    intercept: float
    correlation: float | None
    from_: tuple[float, float] = Field(alias="from")
    to: tuple[float, float]


class Rc6PackagePoint(BaseModel):
    """Average rating of a package at each effort band."""

    package_id: int
    package_name: str
    bajo: float | None
    medio: float | None
    alto: float | None


class Rc6EffortSummary(BaseModel):
    """Visits, ratings and abandonment of one effort band."""

    effort: EffortLevel
    label: str
    visits: int
    rated: int
    rating: float | None
    abandonment: float


class Rc6AbandonmentRow(BaseModel):
    """An activity in a package with its abandonment rate and the guide who created it."""

    id: str
    activity_id: int
    activity_name: str
    effort: EffortLevel
    package_id: int
    package_name: str
    guide_id: int
    guide_name: str
    visits: int
    completed: int
    skipped: int
    abandonment: float
    rating: float | None


class Rc6RequesterRow(BaseModel):
    """A tourist who requested a modification compared with one of their travel groups."""

    id: str
    tourist_id: int
    tourist_name: str
    group_id: int
    group_name: str
    package_id: int
    package_name: str
    requests: int
    visits: int
    rated: int
    rating: float | None
    group_rating: float | None
    difference: float | None


class Rc6Summary(BaseModel):
    """Totals shown in the RC-6 tiles."""

    packages: int
    activities: int
    visits: int
    completed: int
    skipped: int
    rated: int
    rating: float | None
    abandonment: float
    requesters: int
    requests: int


class Rc6Report(BaseModel):
    """RC-6 charts, both result tables, their trend and the summary tiles."""

    scatter: list[Rc6ScatterPoint]
    package_chart: list[Rc6PackagePoint]
    effort_summary: list[Rc6EffortSummary]
    abandonment: list[Rc6AbandonmentRow]
    requesters: list[Rc6RequesterRow]
    trend: Rc6Trend | None
    summary: Rc6Summary
