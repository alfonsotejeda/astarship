"""Report schemas."""

from datetime import date
from enum import StrEnum

from pydantic import BaseModel

from app.models.status import ItineraryStatus


class SortOrder(StrEnum):
    """Direction a report is sorted in."""

    ASC = "asc"
    DESC = "desc"


class EffortLevel(StrEnum):
    """Effort band shown in the reports, derived from the activity's numeric level."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


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


class Rc2SortColumn(StrEnum):
    """Columns the RC-2 table can be sorted by."""

    ACTIVITY_ID = "activity_id"
    ACTIVITY_NAME = "activity_name"
    CATEGORY_ID = "category_id"
    CATEGORY = "category_name"
    ACTIVITY_TYPE_CODE = "activity_type_code"
    ACTIVITY_TYPE = "activity_type_name"
    EFFORT = "effort"
    USES = "uses"
    PERCENTAGE = "percentage"


class Rc2Row(BaseModel):
    """Activity used in final itineraries, with its category, type and effort band."""

    activity_id: int
    activity_name: str
    category_id: int
    category_name: str
    activity_type_code: str
    activity_type_name: str
    effort: EffortLevel
    uses: int
    percentage: float


class Rc2ChartPoint(BaseModel):
    """Uses of one category's activities, stacked by effort level."""

    category_id: int
    category: str
    bajo: int
    medio: int
    alto: int


class Rc2Summary(BaseModel):
    """Totals shown in the RC-2 tiles."""

    final_itineraries: int
    distinct_activities: int
    total_uses: int
    high_effort_uses: int


class Rc2Report(BaseModel):
    """RC-2 table rows, the category by effort chart data and the summary tiles."""

    rows: list[Rc2Row]
    chart: list[Rc2ChartPoint]
    summary: Rc2Summary
