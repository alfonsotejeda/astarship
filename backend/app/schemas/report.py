"""Report schemas."""

from datetime import date
from enum import StrEnum

from pydantic import BaseModel

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
