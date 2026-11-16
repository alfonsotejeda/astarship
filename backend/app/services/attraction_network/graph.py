"""The attraction network as a graph: attractions are the nodes, travels the edges (RF-32)."""

from collections.abc import Iterable
from dataclasses import dataclass
from itertools import combinations

from app.services.attraction_network.tariff import Tariff, Travel, distance_m


@dataclass(frozen=True)
class Node:
    """An attraction as the network sees it: just what it needs to place and show it."""

    id: int
    name: str
    latitude: float
    longitude: float


@dataclass(frozen=True)
class Edge:
    """A directed connection from one attraction to `target`."""

    target: int
    travel: Travel


class AttractionNetwork:
    """Graph of attractions stored as an adjacency list: each node with the edges leaving it.

    Edges are directed, as in the design, so that A→B and B→A may differ in the future.
    Today they are generated from the straight-line distance, so both directions are equal.
    """

    def __init__(self, nodes: Iterable[Node], tariff: Tariff | None = None) -> None:
        """Connect every pair of nodes the tariff can reach.

        Args:
            nodes: Attractions of the network.
            tariff: Rules for distance, time and cost; the default one if not given.
        """
        tariff = tariff or Tariff()
        self._nodes = {node.id: node for node in nodes}
        self._edges: dict[int, list[Edge]] = {node_id: [] for node_id in self._nodes}

        # Each pair once: the distance from A to B is the same as from B to A
        for a, b in combinations(self._nodes.values(), 2):
            meters = distance_m(a.latitude, a.longitude, b.latitude, b.longitude)
            travel = tariff.travel(meters)
            if travel is None:
                continue
            self._edges[a.id].append(Edge(target=b.id, travel=travel))
            self._edges[b.id].append(Edge(target=a.id, travel=travel))

        for edges in self._edges.values():
            edges.sort(key=lambda edge: edge.travel.seconds)

    def node(self, node_id: int) -> Node | None:
        """Return the node with that id, or None if it is not in the network."""
        return self._nodes.get(node_id)

    def edges_from(self, node_id: int) -> list[Edge]:
        """Return the edges leaving a node, quickest first; none if it is not in the network."""
        return list(self._edges.get(node_id, []))
