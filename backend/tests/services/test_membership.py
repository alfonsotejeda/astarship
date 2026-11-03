"""Tests for the membership service."""

from app.schemas.travel_group import TravelGroupCreate
from app.schemas.user import GuideCreate, TouristCreate
from app.services import membership as membership_service
from app.services import travel_group as travel_group_service
from app.services import user as user_service


def _create_tourist(db_session, email="ada@example.com"):
    return user_service.create_user(
        db_session,
        TouristCreate(name="Ada", role="tourist", email=email, password="x", age=30),
    )


def _create_guide(db_session, email="gil@example.com"):
    return user_service.create_user(
        db_session,
        GuideCreate(name="Gil", role="guide", email=email, password="x", specialty="History"),
    )


def _create_travel_group(db_session, name="Backpackers"):
    guide = _create_guide(db_session, f"{name.lower()}@example.com")
    return travel_group_service.create_travel_group(
        db_session, TravelGroupCreate(name=name, guide_id=guide.id)
    )


def test_create_membership_adds_the_tourist_to_the_group(db_session):
    user = _create_tourist(db_session)
    travel_group = _create_travel_group(db_session)

    membership_service.create_membership(db_session, travel_group.id, user.id)

    assert [g.id for g in user.tourist.travel_groups] == [travel_group.id]


def test_tourist_can_belong_to_several_groups(db_session):
    user = _create_tourist(db_session)
    first = _create_travel_group(db_session, "First")
    second = _create_travel_group(db_session, "Second")

    membership_service.create_membership(db_session, first.id, user.id)
    membership_service.create_membership(db_session, second.id, user.id)

    assert {g.id for g in user.tourist.travel_groups} == {first.id, second.id}


def test_get_membership_returns_none_when_missing(db_session):
    assert membership_service.get_membership(db_session, 999, 999) is None


def test_delete_membership_removes_the_tourist_from_the_group(db_session):
    user = _create_tourist(db_session)
    travel_group = _create_travel_group(db_session)
    membership = membership_service.create_membership(db_session, travel_group.id, user.id)

    membership_service.delete_membership(db_session, membership)

    assert membership_service.get_membership(db_session, travel_group.id, user.id) is None
    assert user.tourist.travel_groups == []


def test_deleting_the_tourist_removes_its_memberships(db_session):
    user = _create_tourist(db_session)
    travel_group = _create_travel_group(db_session)
    membership_service.create_membership(db_session, travel_group.id, user.id)

    user_service.delete_user(db_session, user)

    assert membership_service.get_membership(db_session, travel_group.id, user.id) is None


def test_deleting_the_travel_group_removes_its_memberships(db_session):
    user = _create_tourist(db_session)
    travel_group = _create_travel_group(db_session)
    membership_service.create_membership(db_session, travel_group.id, user.id)

    travel_group_service.delete_travel_group(db_session, travel_group)

    assert membership_service.get_membership(db_session, travel_group.id, user.id) is None
    assert user.tourist.travel_groups == []
