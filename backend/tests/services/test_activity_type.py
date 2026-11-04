"""Tests for the activity type service."""

import pytest

from app.schemas.activity import ActivityCreate
from app.schemas.activity_type import ActivityTypeCreate, ActivityTypeUpdate
from app.schemas.category import CategoryCreate
from app.schemas.user import GuideCreate
from app.services import activity as activity_service
from app.services import activity_type as activity_type_service
from app.services import category as category_service
from app.services import user as user_service


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


def test_delete_activity_type_with_activities_raises(db_session):
    activity_type = activity_type_service.create_activity_type(
        db_session, ActivityTypeCreate(code="HIKE", name="Hiking")
    )
    category = category_service.create_category(db_session, CategoryCreate(name="Adventure"))
    guide = user_service.create_user(
        db_session,
        GuideCreate(
            name="Gil", role="guide", email="gil@example.com", password="x", specialty="History"
        ),
    )
    activity_service.create_activity(
        db_session,
        ActivityCreate(
            name="Hiking",
            effort_level=3,
            activity_type_code="HIKE",
            category_id=category.id,
            guide_id=guide.id,
        ),
    )

    with pytest.raises(ValueError, match="existing activities"):
        activity_type_service.delete_activity_type(db_session, activity_type)

    assert activity_type_service.get_activity_type(db_session, "HIKE") is not None
