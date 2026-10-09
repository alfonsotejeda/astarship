"""Tests for the travel group service."""

from app.schemas.travel_group import TravelGroupCreate, TravelGroupUpdate
from app.services import travel_group as travel_group_service


def test_create_travel_group_persists_it(db_session):
    data = TravelGroupCreate(name="Backpackers")

    travel_group = travel_group_service.create_travel_group(db_session, data)

    assert travel_group.id is not None
    assert travel_group.name == "Backpackers"


def test_get_travel_group_returns_none_when_missing(db_session):
    assert travel_group_service.get_travel_group(db_session, 999) is None


def test_update_travel_group_applies_partial_changes(db_session):
    travel_group = travel_group_service.create_travel_group(
        db_session, TravelGroupCreate(name="Old")
    )

    updated = travel_group_service.update_travel_group(
        db_session, travel_group, TravelGroupUpdate(name="New")
    )

    assert updated.name == "New"
    assert updated.id == travel_group.id


def test_delete_travel_group_removes_it(db_session):
    travel_group = travel_group_service.create_travel_group(
        db_session, TravelGroupCreate(name="Temp")
    )

    travel_group_service.delete_travel_group(db_session, travel_group)

    assert travel_group_service.get_travel_group(db_session, travel_group.id) is None
