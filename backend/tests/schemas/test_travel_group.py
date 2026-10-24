"""Tests for the travel group schemas."""

import pytest
from pydantic import ValidationError

from app.schemas.travel_group import TravelGroupCreate, TravelGroupUpdate


def test_create_requires_required_fields():
    with pytest.raises(ValidationError):
        TravelGroupCreate()


def test_create_accepts_valid_data():
    travel_group = TravelGroupCreate(name="Backpackers", guide_id=1)

    assert travel_group.name == "Backpackers"
    assert travel_group.guide_id == 1


def test_create_requires_guide():
    with pytest.raises(ValidationError):
        TravelGroupCreate(name="Backpackers")


def test_update_allows_partial_data():
    update = TravelGroupUpdate(name="New name")

    assert update.name == "New name"
    assert update.guide_id is None
