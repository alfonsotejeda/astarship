"""Tests for the itinerary schemas."""

from datetime import date

import pytest
from pydantic import ValidationError

from app.models.status import ItineraryStatus
from app.schemas.itinerary import ItineraryCreate, ItineraryGenerate, ItineraryUpdate


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


def _generate(**overrides) -> ItineraryGenerate:
    fields = {"package_id": 1, "days": 1, "activity_count": 2, "candidate_ids": [1, 2]}
    return ItineraryGenerate(**{**fields, **overrides})


def test_generate_defaults_to_no_proportions():
    data = _generate()

    assert data.proportion_types == []
    assert data.proportion_categories == []


@pytest.mark.parametrize(
    "overrides",
    [
        {"candidate_ids": []},
        {"candidate_ids": [1, 1]},
        {"days": 0},
        {"days": 3},
        {"activity_count": 0},
        {"proportion_types": [{"activity_type_code": "walk", "value": 101}]},
        {
            "proportion_types": [
                {"activity_type_code": "walk", "value": 60},
                {"activity_type_code": "show", "value": 50},
            ]
        },
        {
            "proportion_types": [
                {"activity_type_code": "walk", "value": 10},
                {"activity_type_code": "walk", "value": 20},
            ]
        },
        {
            "proportion_categories": [
                {"category_id": 1, "value": 70},
                {"category_id": 2, "value": 40},
            ]
        },
        {
            "proportion_categories": [
                {"category_id": 1, "value": 10},
                {"category_id": 1, "value": 20},
            ]
        },
    ],
)
def test_generate_rejects_inconsistent_parameters(overrides):
    with pytest.raises(ValidationError):
        _generate(**overrides)
