"""Report schemas."""

from datetime import date
from enum import StrEnum

from pydantic import BaseModel

from app.models.status import ItineraryStatus


class SortOrder(StrEnum):
    """Direction a report is sorted in."""

    ASC = "asc"
    DESC = "desc"


class Rc5Set(StrEnum):
    """Subset of itineraries the RC-5 comparison is restricted to."""

    ALL = ""
    APPROVED = "approved"
    ASSIGNED = "assigned"
    VALIDATED = "validated"
    PENDING = "pending"
    REJECTED = "rejected"


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


class Rc5SortColumn(StrEnum):
    """Columns the RC-5 table can be sorted by."""

    ID = "id"
    PACKAGE = "package_name"
    CREATION_DATE = "creation_date"
    STATUS = "status"
    ASSIGNED = "assigned"
    ACTIVITY_COUNT = "activity_count"
    PROPORTION = "proportion"
    COVERAGE = "covered_categories"
    PACKAGE_CATEGORIES = "package_categories"
    HIGH_EFFORT = "high_effort"
    CRITERIA_MET = "criteria_met"
    BALANCED = "balanced"


class Rc5TypeValue(BaseModel):
    """Number of activities of one type in an itinerary."""

    activity_type_code: str
    activity_type_name: str
    count: int


class Rc5TypeChartPoint(BaseModel):
    """Activities of a package stacked by activity type."""

    package_id: int
    package_name: str
    visita: int
    excursion: int
    taller: int


class Rc5EffortChartPoint(BaseModel):
    """Activities of a package stacked by effort band."""

    package_id: int
    package_name: str
    bajo: int
    medio: int
    alto: int


class Rc5Row(BaseModel):
    """An itinerary compared with its package's parametrization and coverage."""

    id: int
    package_id: int
    package_name: str
    creation_date: date
    status: ItineraryStatus
    assigned: bool
    activity_count: int
    activity_types: list[Rc5TypeValue]
    proportion: list[int]
    covered_categories: int
    package_categories: int
    high_effort: int
    criteria_met: int
    criteria_total: int
    balanced: bool


class Rc5Summary(BaseModel):
    """Totals shown in the RC-5 tiles."""

    itineraries: int
    packages: int
    activities: int
    balanced: int
    unbalanced: int
    high_effort: int


class Rc5Report(BaseModel):
    """RC-5 table rows, the two package charts and the summary tiles."""

    rows: list[Rc5Row]
    type_chart: list[Rc5TypeChartPoint]
    effort_chart: list[Rc5EffortChartPoint]
    summary: Rc5Summary
