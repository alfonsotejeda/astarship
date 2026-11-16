"""Tests for the attraction network graph."""

from app.services.attraction_network.graph import AttractionNetwork, Node
from app.services.attraction_network.tariff import Tariff, TravelMode

# About 0.0090 degrees of latitude are 1 km, so these sit on a north-south line
PLAZA = Node(id=1, name="Plaza de Armas", latitude=23.1400, longitude=-82.35)
CATEDRAL = Node(id=2, name="Catedral", latitude=23.1445, longitude=-82.35)  # 500 m from Plaza
CAPITOLIO = Node(id=3, name="Capitolio", latitude=23.1670, longitude=-82.35)  # 3 km from Plaza
VARADERO = Node(id=4, name="Varadero", latitude=23.1400, longitude=-81.25)  # ~112 km away


def _targets(network, node_id):
    return [edge.target for edge in network.edges_from(node_id)]


def test_nearby_attractions_are_connected_both_ways():
    network = AttractionNetwork([PLAZA, CATEDRAL])

    assert _targets(network, PLAZA.id) == [CATEDRAL.id]
    assert _targets(network, CATEDRAL.id) == [PLAZA.id]


def test_both_directions_have_the_same_travel():
    network = AttractionNetwork([PLAZA, CATEDRAL])

    there = network.edges_from(PLAZA.id)[0].travel
    back = network.edges_from(CATEDRAL.id)[0].travel

    assert there == back
    assert there.mode is TravelMode.WALK


def test_attractions_beyond_the_reach_are_not_connected():
    network = AttractionNetwork([PLAZA, CATEDRAL, VARADERO])

    assert VARADERO.id not in _targets(network, PLAZA.id)
    assert network.edges_from(VARADERO.id) == []


def test_every_reachable_pair_is_connected():
    network = AttractionNetwork([PLAZA, CATEDRAL, CAPITOLIO])

    for node in (PLAZA, CATEDRAL, CAPITOLIO):
        assert len(network.edges_from(node.id)) == 2


def test_edges_are_sorted_quickest_first():
    network = AttractionNetwork([CAPITOLIO, PLAZA, CATEDRAL])

    assert _targets(network, PLAZA.id) == [CATEDRAL.id, CAPITOLIO.id]
    walk, taxi = network.edges_from(PLAZA.id)
    assert walk.travel.mode is TravelMode.WALK
    assert taxi.travel.mode is TravelMode.TAXI


def test_a_smaller_reach_drops_the_long_edges():
    network = AttractionNetwork([PLAZA, CATEDRAL, CAPITOLIO], Tariff(max_meters=1_000))

    assert _targets(network, PLAZA.id) == [CATEDRAL.id]
    assert network.edges_from(CAPITOLIO.id) == []


def test_unknown_node_has_no_edges():
    network = AttractionNetwork([PLAZA])

    assert network.node(99) is None
    assert network.edges_from(99) == []


def test_node_returns_the_stored_attraction():
    network = AttractionNetwork([PLAZA])

    assert network.node(PLAZA.id) == PLAZA


def test_edges_from_returns_a_copy():
    network = AttractionNetwork([PLAZA, CATEDRAL])

    network.edges_from(PLAZA.id).clear()

    assert _targets(network, PLAZA.id) == [CATEDRAL.id]


def test_empty_network():
    assert AttractionNetwork([]).edges_from(1) == []
