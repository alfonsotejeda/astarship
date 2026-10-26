"""Tests for the proportion type service."""

from datetime import date

from app.schemas.activity_type import ActivityTypeCreate
from app.schemas.itinerary import ItineraryCreate
from app.schemas.proportion_type import ProportionTypeCreate, ProportionTypeUpdate
from app.services import activity_type as activity_type_service
from app.services import itinerary as itinerary_service
from app.services import proportion_type as proportion_type_service


def _create_itinerary(db_session):
    return itinerary_service.create_itinerary(
        db_session,
        ItineraryCreate(creation_date=date(2026, 1, 1), activity_count=4),
    )


def _create_activity_type(db_session, code="visit"):
    return activity_type_service.create_activity_type(
        db_session, ActivityTypeCreate(code=code, name=code.title())
    )


def test_create_proportion_type_stores_the_value(db_session):
    itinerary = _create_itinerary(db_session)
    activity_type = _create_activity_type(db_session)

    proportion_type = proportion_type_service.create_proportion_type(
        db_session, itinerary.id, activity_type.code, ProportionTypeCreate(value=40)
    )

    assert proportion_type.itinerary_id == itinerary.id
    assert proportion_type.activity_type_code == activity_type.code
    assert proportion_type.value == 40


def test_update_proportion_type_replaces_the_value(db_session):
    itinerary = _create_itinerary(db_session)
    activity_type = _create_activity_type(db_session)
    proportion_type = proportion_type_service.create_proportion_type(
        db_session, itinerary.id, activity_type.code, ProportionTypeCreate(value=40)
    )

    proportion_type_service.update_proportion_type(
        db_session, proportion_type, ProportionTypeUpdate(value=60)
    )

    proportion_type = proportion_type_service.get_proportion_type(
        db_session, itinerary.id, activity_type.code
    )
    assert proportion_type.value == 60
    assert len(proportion_type_service.list_proportion_types(db_session, itinerary.id)) == 1


def test_list_proportion_types_only_returns_the_itinerary_ones(db_session):
    itinerary = _create_itinerary(db_session)
    other = _create_itinerary(db_session)
    visit = _create_activity_type(db_session, "visit")
    workshop = _create_activity_type(db_session, "workshop")
    proportion_type_service.create_proportion_type(
        db_session, itinerary.id, visit.code, ProportionTypeCreate(value=50)
    )
    proportion_type_service.create_proportion_type(
        db_session, itinerary.id, workshop.code, ProportionTypeCreate(value=50)
    )
    proportion_type_service.create_proportion_type(
        db_session, other.id, visit.code, ProportionTypeCreate(value=100)
    )

    proportion_types = proportion_type_service.list_proportion_types(db_session, itinerary.id)

    assert {p.activity_type_code for p in proportion_types} == {visit.code, workshop.code}


def test_get_proportion_type_returns_none_when_missing(db_session):
    assert proportion_type_service.get_proportion_type(db_session, 999, "missing") is None


def test_delete_proportion_type_removes_it(db_session):
    itinerary = _create_itinerary(db_session)
    activity_type = _create_activity_type(db_session)
    proportion_type = proportion_type_service.create_proportion_type(
        db_session, itinerary.id, activity_type.code, ProportionTypeCreate(value=40)
    )

    proportion_type_service.delete_proportion_type(db_session, proportion_type)

    assert (
        proportion_type_service.get_proportion_type(db_session, itinerary.id, activity_type.code)
        is None
    )


def test_deleting_the_itinerary_removes_its_proportion_types(db_session):
    itinerary = _create_itinerary(db_session)
    activity_type = _create_activity_type(db_session)
    proportion_type_service.create_proportion_type(
        db_session, itinerary.id, activity_type.code, ProportionTypeCreate(value=40)
    )

    itinerary_service.delete_itinerary(db_session, itinerary)

    assert (
        proportion_type_service.get_proportion_type(db_session, itinerary.id, activity_type.code)
        is None
    )


def test_deleting_the_activity_type_removes_its_proportion_types(db_session):
    itinerary = _create_itinerary(db_session)
    activity_type = _create_activity_type(db_session)
    proportion_type_service.create_proportion_type(
        db_session, itinerary.id, activity_type.code, ProportionTypeCreate(value=40)
    )

    activity_type_service.delete_activity_type(db_session, activity_type)

    assert proportion_type_service.list_proportion_types(db_session, itinerary.id) == []
