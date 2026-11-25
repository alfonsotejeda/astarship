"""Schemas for a tourist's current itinerary day."""

from datetime import date, time
from typing import Literal

from pydantic import BaseModel


class TodayGuideRead(BaseModel):
    """Guide details shown alongside today's itinerary."""

    name: str
    phone: str | None
    specialty: str | None


class TodayTravelRead(BaseModel):
    """Travel details between two itinerary stops."""

    minutes: int
    mode: Literal["walk", "taxi", "bus"]


class TodayStopRead(BaseModel):
    """Activity details and visit state for one itinerary stop."""

    activity_id: int
    order: int
    start_time: time
    activity_name: str
    attraction_id: int | None
    attraction_name: str | None
    activity_type_code: str | None
    effort_level: int
    duration_minutes: int
    visit_status: Literal["done", "skipped"] | None
    rating: int | None
    travel: TodayTravelRead | None


class TodayDayRead(BaseModel):
    """Scheduled activities for one calendar day of a trip."""

    day: int
    date: date
    stops: list[TodayStopRead]


class TodayAlternativeRead(BaseModel):
    """Replacement activity proposed for the current day."""

    reason: str
    activity_name: str
    start_time: time


class TodayRead(BaseModel):
    """Trip overview consumed by the tourist's today screen."""

    itinerary_id: int
    package_name: str
    guide: TodayGuideRead
    day: int
    days: list[TodayDayRead]
    alternative: TodayAlternativeRead | None