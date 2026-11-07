"""Tests for the travel group service."""

from app.schemas.travel_group import TravelGroupCreate, TravelGroupUpdate
from app.schemas.user import GuideCreate
from app.services import travel_group as travel_group_service
from app.services import user as user_service


def _create_guide(db_session, email="gil@example.com"):
    return user_service.create_user(
        db_session,
        GuideCreate(name="Gil", role="guide", email=email, password="x", specialty="History"),
    )


def _create_travel_group(db_session, guide_id, name="Backpackers"):
    return travel_group_service.create_travel_group(
        db_session, TravelGroupCreate(name=name, guide_id=guide_id)
    )


def test_create_travel_group_persists_it(db_session):
    guide = _create_guide(db_session)

    travel_group = _create_travel_group(db_session, guide.id)

    assert travel_group.id is not None
    assert travel_group.name == "Backpackers"
    assert travel_group.guide_id == guide.id


def test_get_travel_group_returns_none_when_missing(db_session):
    assert travel_group_service.get_travel_group(db_session, 999) is None


def test_update_travel_group_applies_partial_changes(db_session):
    guide = _create_guide(db_session)
    travel_group = _create_travel_group(db_session, guide.id, "Old")

    updated = travel_group_service.update_travel_group(
        db_session, travel_group, TravelGroupUpdate(name="New")
    )

    assert updated.name == "New"
    assert updated.id == travel_group.id
    assert updated.guide_id == guide.id


def test_update_travel_group_changes_guide(db_session):
    first = _create_guide(db_session, "first@example.com")
    second = _create_guide(db_session, "second@example.com")
    travel_group = _create_travel_group(db_session, first.id)

    updated = travel_group_service.update_travel_group(
        db_session, travel_group, TravelGroupUpdate(guide_id=second.id)
    )

    assert updated.guide_id == second.id


def test_delete_travel_group_removes_it(db_session):
    guide = _create_guide(db_session)
    travel_group = _create_travel_group(db_session, guide.id, "Temp")

    travel_group_service.delete_travel_group(db_session, travel_group)

    assert travel_group_service.get_travel_group(db_session, travel_group.id) is None


def test_guide_attends_travel_groups(db_session):
    guide = _create_guide(db_session)

    assert not travel_group_service.guide_attends_travel_groups(db_session, guide.id)

    _create_travel_group(db_session, guide.id)

    assert travel_group_service.guide_attends_travel_groups(db_session, guide.id)
