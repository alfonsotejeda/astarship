"""Tests for the attraction network kept in memory."""

from sqlalchemy.orm import Session

from app.models.attraction import Attraction
from app.services.attraction_network import store


def _add(db: Session, name: str, latitude: float) -> Attraction:
    attraction = Attraction(name=name, address="Street 1", latitude=latitude, longitude=-82.35)
    db.add(attraction)
    db.commit()
    return attraction


def test_network_is_built_from_the_stored_attractions(db_session):
    plaza = _add(db_session, "Plaza de Armas", 23.1400)
    catedral = _add(db_session, "Catedral", 23.1445)

    network = store.get_network(db_session)

    assert network.node(plaza.id).name == "Plaza de Armas"
    assert [edge.target for edge in network.edges_from(plaza.id)] == [catedral.id]


def test_network_without_attractions_is_empty(db_session):
    assert store.get_network(db_session).edges_from(1) == []


def test_network_is_reused_between_calls(db_session):
    _add(db_session, "Plaza de Armas", 23.1400)

    assert store.get_network(db_session) is store.get_network(db_session)


def test_changes_are_not_seen_until_the_network_is_invalidated(db_session):
    _add(db_session, "Plaza de Armas", 23.1400)
    store.get_network(db_session)
    catedral = _add(db_session, "Catedral", 23.1445)

    assert store.get_network(db_session).node(catedral.id) is None

    store.invalidate()

    assert store.get_network(db_session).node(catedral.id) is not None
