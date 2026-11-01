"""Tests for the activity service."""

from app.models.status import ReviewStatus
from app.schemas.activity import ActivityCreate, ActivityUpdate
from app.services import activity as activity_service


def test_create_activity_persists_it(db_session):
    data = ActivityCreate(name="Hiking", effort_level=3)

    activity = activity_service.create_activity(db_session, data)

    assert activity.id is not None
    assert activity.name == "Hiking"
    assert activity.status is ReviewStatus.PENDING
    assert activity.creation_date is not None


def test_get_activity_returns_none_when_missing(db_session):
    assert activity_service.get_activity(db_session, 999) is None


def test_update_activity_applies_partial_changes(db_session):
    activity = activity_service.create_activity(
        db_session, ActivityCreate(name="Old", effort_level=1)
    )

    updated = activity_service.update_activity(db_session, activity, ActivityUpdate(name="New"))

    assert updated.name == "New"
    assert updated.effort_level == 1


def test_delete_activity_removes_it(db_session):
    activity = activity_service.create_activity(
        db_session, ActivityCreate(name="Temp", effort_level=1)
    )

    activity_service.delete_activity(db_session, activity)

    assert activity_service.get_activity(db_session, activity.id) is None
