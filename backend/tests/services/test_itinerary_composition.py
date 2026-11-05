"""Tests for the itinerary composition service."""

import itertools
from datetime import date, time

from app.schemas.activity import ActivityCreate
from app.schemas.activity_type import ActivityTypeCreate
from app.schemas.attraction import AttractionCreate
from app.schemas.category import CategoryCreate
from app.schemas.itinerary import ItineraryCreate
from app.schemas.itinerary_composition import (
    ItineraryCompositionCreate,
    ItineraryCompositionUpdate,
)
from app.schemas.user import GuideCreate
from app.services import activity as activity_service
from app.services import activity_type as activity_type_service
from app.services import attraction as attraction_service
from app.services import category as category_service
from app.services import itinerary as itinerary_service
from app.services import itinerary_composition as composition_service
from app.services import user as user_service


def _create_itinerary(db_session, owners):
    return itinerary_service.create_itinerary(
        db_session, ItineraryCreate(creation_date=date(2026, 1, 1), activity_count=2, **owners)
    )


_ids = itertools.count(1)


def _create_activity(db_session, name="Museum"):
    n = next(_ids)
    category = category_service.create_category(db_session, CategoryCreate(name=f"Category {n}"))
    activity_type = activity_type_service.create_activity_type(
        db_session, ActivityTypeCreate(code=f"T{n}", name=f"Type {n}")
    )
    guide = user_service.create_user(
        db_session,
        GuideCreate(
            name="Gil",
            role="guide",
            email=f"gil{n}@example.com",
            password="x",
            specialty="History",
        ),
    )
    attraction = attraction_service.create_attraction(
        db_session,
        AttractionCreate(
            name=f"Attraction {n}", address="Av. del Puerto", latitude=23.14, longitude=-82.36
        ),
    )
    return activity_service.create_activity(
        db_session,
        ActivityCreate(
            name=name,
            effort_level=1,
            duration=60,
            activity_type_code=activity_type.code,
            category_id=category.id,
            guide_id=guide.id,
            attraction_id=attraction.id,
        ),
    )


def _compose(db_session, itinerary, activity, order=1, day=1, start_time=time(9)):
    return composition_service.create_composition(
        db_session,
        itinerary.id,
        activity.id,
        ItineraryCompositionCreate(order=order, day=day, start_time=start_time),
    )


def test_create_composition_stores_the_attributes(db_session, itinerary_owners):
    itinerary = _create_itinerary(db_session, itinerary_owners)
    activity = _create_activity(db_session)

    composition = _compose(db_session, itinerary, activity, order=2, day=3, start_time=time(10, 30))

    assert composition.itinerary_id == itinerary.id
    assert composition.activity_id == activity.id
    assert composition.order == 2
    assert composition.day == 3
    assert composition.start_time == time(10, 30)


def test_list_compositions_returns_the_itinerary_ones_in_order(db_session, itinerary_owners):
    itinerary = _create_itinerary(db_session, itinerary_owners)
    other = _create_itinerary(db_session, itinerary_owners)
    museum = _create_activity(db_session, "Museum")
    hike = _create_activity(db_session, "Hike")
    _compose(db_session, itinerary, museum, order=2)
    _compose(db_session, itinerary, hike, order=1)
    _compose(db_session, other, museum, order=1)

    compositions = composition_service.list_compositions(db_session, itinerary.id)

    assert [c.activity_id for c in compositions] == [hike.id, museum.id]


def test_update_composition_applies_partial_changes(db_session, itinerary_owners):
    itinerary = _create_itinerary(db_session, itinerary_owners)
    activity = _create_activity(db_session)
    composition = _compose(db_session, itinerary, activity)

    composition_service.update_composition(
        db_session, composition, ItineraryCompositionUpdate(day=2)
    )

    composition = composition_service.get_composition(db_session, itinerary.id, activity.id)
    assert composition.day == 2
    assert composition.order == 1
    assert composition.start_time == time(9)


def test_get_composition_returns_none_when_missing(db_session):
    assert composition_service.get_composition(db_session, 999, 999) is None


def test_delete_composition_removes_it(db_session, itinerary_owners):
    itinerary = _create_itinerary(db_session, itinerary_owners)
    activity = _create_activity(db_session)
    composition = _compose(db_session, itinerary, activity)

    composition_service.delete_composition(db_session, composition)

    assert composition_service.get_composition(db_session, itinerary.id, activity.id) is None


def test_deleting_the_itinerary_removes_its_compositions(db_session, itinerary_owners):
    itinerary = _create_itinerary(db_session, itinerary_owners)
    activity = _create_activity(db_session)
    _compose(db_session, itinerary, activity)

    itinerary_service.delete_itinerary(db_session, itinerary)

    assert composition_service.get_composition(db_session, itinerary.id, activity.id) is None


def test_deleting_the_activity_removes_its_compositions(db_session, itinerary_owners):
    itinerary = _create_itinerary(db_session, itinerary_owners)
    activity = _create_activity(db_session)
    _compose(db_session, itinerary, activity)

    activity_service.delete_activity(db_session, activity)

    assert composition_service.list_compositions(db_session, itinerary.id) == []
