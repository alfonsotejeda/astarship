"""Attraction service."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.attraction import Attraction
from app.schemas.activity import ActivityRead
from app.schemas.attraction import (
    AttractionConnection,
    AttractionCreate,
    AttractionDetail,
    AttractionRead,
    AttractionSummary,
    AttractionUpdate,
)
from app.services.attraction_network import store as network_store


def list_attractions(db: Session) -> list[Attraction]:
    """Return all attractions ordered by id."""
    return list(db.scalars(select(Attraction).order_by(Attraction.id)))


def get_attraction(db: Session, attraction_id: int) -> Attraction | None:
    """Return an attraction by id, or None if it doesn't exist."""
    return db.get(Attraction, attraction_id)


def list_summaries(db: Session) -> list[AttractionSummary]:
    """Return every attraction with its number of activities, ordered by id."""
    return [
        AttractionSummary(
            **AttractionRead.model_validate(attraction).model_dump(), activity_count=count
        )
        for attraction, count in activities_count_by_attractions(db)
    ]


def get_detail(db: Session, attraction: Attraction) -> AttractionDetail:
    """Return the attraction with its activities and its connections in the network."""
    activities = activities_by_attraction(db, attraction.id)
    return AttractionDetail(
        **AttractionRead.model_validate(attraction).model_dump(),
        activity_count=len(activities),
        activities=[ActivityRead.model_validate(activity) for activity in activities],
        connections=connections_of(db, attraction.id),
    )


def connections_of(db: Session, attraction_id: int) -> list[AttractionConnection]:
    """Return the connections of an attraction in the network, quickest first."""
    network = network_store.get_network(db)
    connections = []
    for edge in network.edges_from(attraction_id):
        travel = edge.travel
        connections.append(
            AttractionConnection(
                attraction_id=edge.target,
                name=network.node(edge.target).name,
                meters=round(travel.meters),
                minutes=max(1, round(travel.seconds / 60)),
                cost=round(travel.cost, 2),
                mode=travel.mode,
            )
        )
    return connections


def create_attraction(db: Session, data: AttractionCreate) -> Attraction:
    """Create and persist a new attraction."""
    attraction = Attraction(**data.model_dump())
    db.add(attraction)
    db.commit()
    network_store.invalidate()
    db.refresh(attraction)
    return attraction


def update_attraction(db: Session, attraction: Attraction, data: AttractionUpdate) -> Attraction:
    """Apply partial updates to an existing attraction."""
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(attraction, field, value)
    db.commit()
    network_store.invalidate()
    db.refresh(attraction)
    return attraction


def delete_attraction(db: Session, attraction: Attraction) -> None:
    """Delete an attraction."""
    if attraction.activities:
        raise ValueError("Attraction still has activities")
    db.delete(attraction)
    db.commit()
    network_store.invalidate()


def activities_by_attraction(db: Session, attraction_id: int) -> list[Activity]:
    """Return the activities of an attraction ordered by name."""
    if db.get(Attraction, attraction_id) is None:
        raise LookupError("Attraction not found")
    return list(
        db.scalars(
            select(Activity).where(Activity.attraction_id == attraction_id).order_by(Activity.name)
        )
    )


def activities_count_by_attractions(db: Session) -> list[tuple[Attraction, int]]:
    """Return every attraction with its number of activities, including zero."""
    rows = db.execute(
        select(Attraction, func.count(Activity.id))
        .outerjoin(Activity, Activity.attraction_id == Attraction.id)
        .group_by(Attraction.id)
        .order_by(Attraction.id)
    )
    return [(attraction, count) for attraction, count in rows]
