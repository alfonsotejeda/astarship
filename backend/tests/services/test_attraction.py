"""Tests for the attraction service."""

import pytest

from app.schemas.activity import ActivityCreate
from app.schemas.activity_type import ActivityTypeCreate
from app.schemas.attraction import AttractionCreate, AttractionUpdate
from app.schemas.category import CategoryCreate
from app.schemas.user import GuideCreate
from app.services import activity as activity_service
from app.services import activity_type as activity_type_service
from app.services import attraction as attraction_service
from app.services import category as category_service
from app.services import user as user_service


def _data(name="Malecón") -> AttractionCreate:
    return AttractionCreate(name=name, address="Av. del Puerto", latitude=23.14, longitude=-82.36)


@pytest.fixture
def refs(db_session):
    """Category, activity type and guide that every activity needs."""
    category = category_service.create_category(db_session, CategoryCreate(name="Adventure"))
    activity_type = activity_type_service.create_activity_type(
        db_session, ActivityTypeCreate(code="HIKE", name="Hiking")
    )
    guide = user_service.create_user(
        db_session,
        GuideCreate(
            name="Gil", role="guide", email="gil@example.com", password="x", specialty="History"
        ),
    )
    return {
        "category_id": category.id,
        "activity_type_code": activity_type.code,
        "guide_id": guide.id,
    }


def _add_activity(db_session, refs, attraction, name):
    return activity_service.create_activity(
        db_session,
        ActivityCreate(
            name=name, effort_level=3, duration=90, attraction_id=attraction.id, **refs
        ),
    )


def test_create_attraction_persists_it(db_session):
    attraction = attraction_service.create_attraction(db_session, _data())

    assert attraction.id is not None
    assert attraction.name == "Malecón"
    assert attraction.address == "Av. del Puerto"
    assert attraction.latitude == 23.14
    assert attraction.longitude == -82.36


def test_list_attractions_returns_them_ordered_by_id(db_session):
    first = attraction_service.create_attraction(db_session, _data("A"))
    second = attraction_service.create_attraction(db_session, _data("B"))

    assert [a.id for a in attraction_service.list_attractions(db_session)] == [first.id, second.id]


def test_get_attraction_returns_none_when_missing(db_session):
    assert attraction_service.get_attraction(db_session, 999) is None


def test_update_attraction_applies_partial_changes(db_session):
    attraction = attraction_service.create_attraction(db_session, _data())

    updated = attraction_service.update_attraction(
        db_session, attraction, AttractionUpdate(latitude=10.5)
    )

    assert updated.latitude == 10.5
    assert updated.name == "Malecón"
    assert updated.longitude == -82.36


def test_delete_attraction_removes_it(db_session):
    attraction = attraction_service.create_attraction(db_session, _data())

    attraction_service.delete_attraction(db_session, attraction)

    assert attraction_service.get_attraction(db_session, attraction.id) is None


def test_delete_attraction_with_activities_raises(db_session, refs):
    attraction = attraction_service.create_attraction(db_session, _data())
    _add_activity(db_session, refs, attraction, "Tour")

    with pytest.raises(ValueError, match="activities"):
        attraction_service.delete_attraction(db_session, attraction)

    assert attraction_service.get_attraction(db_session, attraction.id) is not None


def test_activities_by_attraction_returns_only_its_activities_ordered_by_name(db_session, refs):
    malecon = attraction_service.create_attraction(db_session, _data("Malecón"))
    capitolio = attraction_service.create_attraction(db_session, _data("Capitolio"))
    _add_activity(db_session, refs, malecon, "Beta")
    _add_activity(db_session, refs, malecon, "Alpha")
    _add_activity(db_session, refs, capitolio, "Visita")

    result = attraction_service.activities_by_attraction(db_session, malecon.id)

    assert [a.name for a in result] == ["Alpha", "Beta"]


def test_activities_by_attraction_returns_empty_list_when_it_has_none(db_session):
    attraction = attraction_service.create_attraction(db_session, _data())

    assert attraction_service.activities_by_attraction(db_session, attraction.id) == []


def test_activities_by_attraction_raises_when_attraction_is_missing(db_session):
    with pytest.raises(LookupError, match="Attraction"):
        attraction_service.activities_by_attraction(db_session, 999)


def test_activities_count_includes_attractions_without_activities(db_session, refs):
    malecon = attraction_service.create_attraction(db_session, _data("Malecón"))
    capitolio = attraction_service.create_attraction(db_session, _data("Capitolio"))
    _add_activity(db_session, refs, malecon, "Alpha")
    _add_activity(db_session, refs, malecon, "Beta")

    result = attraction_service.activities_count_by_attractions(db_session)

    assert [(a.id, count) for a, count in result] == [(malecon.id, 2), (capitolio.id, 0)]


def test_activities_count_is_empty_without_attractions(db_session):
    assert attraction_service.activities_count_by_attractions(db_session) == []