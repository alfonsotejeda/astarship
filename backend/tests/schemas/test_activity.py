"""Tests for the activity schemas."""

import pytest
from pydantic import ValidationError

from app.schemas.activity import ActivityCreate, ActivityUpdate

REFS = {"activity_type_code": "HIKE", "category_id": 1, "guide_id": 2, "attraction_id": 3}


def test_create_requires_required_fields():
    with pytest.raises(ValidationError):
        ActivityCreate(name="Hiking")


def test_create_requires_duration():
    with pytest.raises(ValidationError):
        ActivityCreate(name="Hiking", effort_level=3, **REFS)


def test_create_accepts_valid_data():
    activity = ActivityCreate(name="Hiking", effort_level=3, duration=90, **REFS)

    assert activity.name == "Hiking"
    assert activity.duration == 90
    assert activity.guide_id == 2
    assert activity.attraction_id == 3


@pytest.mark.parametrize("missing", REFS)
def test_create_requires_every_foreign_key(missing):
    refs = {k: v for k, v in REFS.items() if k != missing}

    with pytest.raises(ValidationError):
        ActivityCreate(name="Hiking", effort_level=3, duration=90, **refs)


@pytest.mark.parametrize("duration", [0, -30])
def test_create_rejects_non_positive_duration(duration):
    with pytest.raises(ValidationError):
        ActivityCreate(name="Hiking", effort_level=3, duration=duration, **REFS)


def test_update_allows_partial_data():
    update = ActivityUpdate(name="New name")

    assert update.name == "New name"
    assert update.effort_level is None
    assert update.duration is None
    assert update.attraction_id is None


def test_update_rejects_non_positive_duration():
    with pytest.raises(ValidationError):
        ActivityUpdate(duration=0)


@pytest.mark.parametrize(
    "field", ["name", "duration", "activity_type_code", "category_id", "guide_id", "attraction_id"]
)
def test_update_rejects_explicit_null(field):
    with pytest.raises(ValidationError):
        ActivityUpdate(**{field: None})