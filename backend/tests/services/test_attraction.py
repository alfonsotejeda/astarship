"""Tests for the attraction service."""

from app.schemas.attraction import AttractionCreate, AttractionUpdate
from app.services import attraction as attraction_service


def _data(name="Malecón") -> AttractionCreate:
    return AttractionCreate(name=name, address="Av. del Puerto", latitude=23.14, longitude=-82.36)


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
