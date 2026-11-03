"""Tests for the activity schemas."""

import pytest
from pydantic import ValidationError

from app.schemas.activity import ActivityCreate, ActivityUpdate

REFS = {"activity_type_code": "HIKE", "category_id": 1, "guide_id": 2}


def test_create_requires_required_fields():
    with pytest.raises(ValidationError):
        ActivityCreate(name="Hiking")


@pytest.mark.parametrize("missing", REFS)
def test_create_requires_every_foreign_key(missing):
    refs = {k: v for k, v in REFS.items() if k != missing}

    with pytest.raises(ValidationError):
        ActivityCreate(name="Hiking", effort_level=3, **refs)


def test_create_accepts_valid_data():
    activity = ActivityCreate(name="Hiking", effort_level=3, **REFS)

    assert activity.name == "Hiking"
    assert activity.activity_type_code == "HIKE"
    assert activity.category_id == 1
    assert activity.guide_id == 2


def test_update_allows_partial_data():
    update = ActivityUpdate(name="New name")

    assert update.name == "New name"
    assert update.model_dump(exclude_unset=True) == {"name": "New name"}


@pytest.mark.parametrize(
    "field",
    ["name", "effort_level", "status", "activity_type_code", "category_id", "guide_id"],
)
def test_update_rejects_explicit_null(field):
    with pytest.raises(ValidationError):
        ActivityUpdate(**{field: None})
