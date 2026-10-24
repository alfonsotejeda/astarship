"""Tests for the itinerary schemas."""

from datetime import date

import pytest
from pydantic import ValidationError

from app.models.status import ItineraryStatus
from app.schemas.itinerary import ItineraryCreate, ItineraryUpdate


def test_create_requires_required_fields():
    with pytest.raises(ValidationError):
        ItineraryCreate(creation_date=date(2026, 1, 1), activity_count=3)


def test_create_accepts_valid_data():
    itinerary = ItineraryCreate(
        creation_date=date(2026, 1, 1), activity_count=3, package_id=1, guide_id=2
    )

    assert itinerary.creation_date == date(2026, 1, 1)
    assert itinerary.activity_count == 3
    assert itinerary.package_id == 1
    assert itinerary.guide_id == 2


def test_update_allows_partial_data():
    update = ItineraryUpdate(status="validated")

    assert update.status is ItineraryStatus.VALIDATED
    assert update.activity_count is None
