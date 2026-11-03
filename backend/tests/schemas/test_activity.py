"""Tests for the activity schemas."""

import pytest
from pydantic import ValidationError

from app.schemas.activity import ActivityCreate, ActivityUpdate


def test_create_requires_required_fields():
    with pytest.raises(ValidationError):
        ActivityCreate(name="Hiking")


def test_create_requires_duration():
    with pytest.raises(ValidationError):
        ActivityCreate(name="Hiking", effort_level=3)


def test_create_accepts_valid_data():
    activity = ActivityCreate(name="Hiking", effort_level=3, duration=90)

    assert activity.name == "Hiking"
    assert activity.duration == 90
    assert activity.category_id is None


@pytest.mark.parametrize("duration", [0, -30])
def test_create_rejects_non_positive_duration(duration):
    with pytest.raises(ValidationError):
        ActivityCreate(name="Hiking", effort_level=3, duration=duration)


def test_update_allows_partial_data():
    update = ActivityUpdate(name="New name")

    assert update.name == "New name"
    assert update.effort_level is None
    assert update.duration is None


def test_update_rejects_non_positive_duration():
    with pytest.raises(ValidationError):
        ActivityUpdate(duration=0)
