"""Tests for the activity schemas."""

import pytest
from pydantic import ValidationError

from app.schemas.activity import ActivityCreate, ActivityUpdate


def test_create_requires_required_fields():
    with pytest.raises(ValidationError):
        ActivityCreate(name="Hiking")


def test_create_accepts_valid_data():
    activity = ActivityCreate(name="Hiking", effort_level=3)

    assert activity.name == "Hiking"
    assert activity.category_id is None


def test_update_allows_partial_data():
    update = ActivityUpdate(name="New name")

    assert update.name == "New name"
    assert update.effort_level is None
