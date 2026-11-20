"""The attraction network kept in memory, built from the database the first time it is needed.

Building it costs one query and n·(n-1)/2 distances, so it is built once and reused until an
attraction changes; then `invalidate()` drops it and the next request builds it again.

The network lives in the memory of this process: with several server processes each one would
keep its own copy, and a change would only invalidate the copy of the process that made it.
"""

from threading import Lock

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.attraction import Attraction
from app.services.attraction_network.graph import AttractionNetwork, Node

_network: AttractionNetwork | None = None
_lock = Lock()


def get_network(db: Session) -> AttractionNetwork:
    """Return the network, building it from the database if there is none in memory."""
    global _network
    with _lock:
        if _network is None:
            _network = _build(db)
        return _network


def invalidate() -> None:
    """Drop the network in memory; call it after any change to the attractions."""
    global _network
    with _lock:
        _network = None


def _build(db: Session) -> AttractionNetwork:
    rows = db.execute(
        select(Attraction.id, Attraction.name, Attraction.latitude, Attraction.longitude)
    )
    return AttractionNetwork(
        Node(id=row.id, name=row.name, latitude=row.latitude, longitude=row.longitude)
        for row in rows
    )
