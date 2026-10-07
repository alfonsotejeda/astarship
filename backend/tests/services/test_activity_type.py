"""Tests for the activity type service."""

from app.schemas.activity_type import ActivityTypeCreate, ActivityTypeUpdate
from app.services import activity_type as activity_type_service


def test_create_activity_type_persists_it(db_session):
    data = ActivityTypeCreate(code="HIKE", name="Hiking")

    activity_type = activity_type_service.create_activity_type(db_session, data)

    assert activity_type.code == "HIKE"
    assert activity_type.name == "Hiking"


def test_get_activity_type_returns_none_when_missing(db_session):
    assert activity_type_service.get_activity_type(db_session, "MISSING") is None


def test_update_activity_type_applies_partial_changes(db_session):
    activity_type = activity_type_service.create_activity_type(
        db_session, ActivityTypeCreate(code="HIKE", name="Old")
    )

    updated = activity_type_service.update_activity_type(
        db_session, activity_type, ActivityTypeUpdate(name="New")
    )

    assert updated.name == "New"
    assert updated.code == "HIKE"


def test_delete_activity_type_removes_it(db_session):
    activity_type = activity_type_service.create_activity_type(
        db_session, ActivityTypeCreate(code="TEMP", name="Temp")
    )

    activity_type_service.delete_activity_type(db_session, activity_type)

    assert activity_type_service.get_activity_type(db_session, "TEMP") is None
