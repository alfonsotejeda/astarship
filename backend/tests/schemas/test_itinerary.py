"""Tests for the itinerary schemas."""

from datetime import date

import pytest
from pydantic import ValidationError

from app.schemas.itinerary import ItineraryCreate, ItineraryUpdate


def test_create_requires_required_fields():
    with pytest.raises(ValidationError):
        ItineraryCreate(creation_date=date(2026, 1, 1))


def test_create_accepts_valid_data():
    itinerary = ItineraryCreate(
        creation_date=date(2026, 1, 1), activity_count=3, validated=False
    )

    assert itinerary.creation_date == date(2026, 1, 1)
    assert itinerary.activity_count == 3
    assert itinerary.validated is False
    assert itinerary.package_id is None
    assert itinerary.creator_id is None


def test_update_allows_partial_data():
    update = ItineraryUpdate(validated=True)

    assert update.validated is True
    assert update.activity_count is None
