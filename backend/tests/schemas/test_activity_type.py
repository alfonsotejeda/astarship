"""Tests for the activity type schemas."""

import pytest
from pydantic import ValidationError

from app.schemas.activity_type import ActivityTypeCreate, ActivityTypeUpdate


def test_create_requires_required_fields():
    with pytest.raises(ValidationError):
        ActivityTypeCreate(code="HIKE")


def test_create_accepts_valid_data():
    activity_type = ActivityTypeCreate(code="HIKE", name="Hiking")

    assert activity_type.code == "HIKE"
    assert activity_type.name == "Hiking"


def test_update_allows_partial_data():
    update = ActivityTypeUpdate(name="New name")

    assert update.name == "New name"
