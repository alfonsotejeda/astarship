"""Attraction service."""

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.attraction import Attraction
from app.models.user.user import User
from app.schemas.activity import ActivityRead
from app.schemas.attraction import (
    AttractionConnection,
    AttractionCreate,
    AttractionDetail,
    AttractionRead,
    AttractionSummary,
    AttractionUpdate,
)
from app.services.activity import visible_to
from app.services.attraction_network import store as network_store


def list_attractions(db: Session) -> list[Attraction]:
    """Return all attractions ordered by id."""
    return list(db.scalars(select(Attraction).order_by(Attraction.id)))


def get_attraction(db: Session, attraction_id: int) -> Attraction | None:
    """Return an attraction by id, or None if it doesn't exist."""
    return db.get(Attraction, attraction_id)


def list_summaries(db: Session, viewer: User) -> list[AttractionSummary]:
    """Return every attraction with how many activities the user can see there, ordered by id."""
    return [
        AttractionSummary(
            **AttractionRead.model_validate(attraction).model_dump(), activity_count=count
        )
        for attraction, count in activities_count_by_attractions(db, viewer)
    ]


def get_detail(db: Session, attraction: Attraction, viewer: User) -> AttractionDetail:
    """Return the attraction with the activities the user can see and its connections."""
    activities = activities_by_attraction(db, attraction.id, viewer)
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


def activities_by_attraction(db: Session, attraction_id: int, viewer: User) -> list[Activity]:
    """Return the activities of an attraction that the user can see, ordered by name."""
    if db.get(Attraction, attraction_id) is None:
        raise LookupError("Attraction not found")
    statement = (
        select(Activity)
        .where(Activity.attraction_id == attraction_id, visible_to(viewer))
        .order_by(Activity.name)
    )
    return list(db.scalars(statement))


def activities_count_by_attractions(db: Session, viewer: User) -> list[tuple[Attraction, int]]:
    """Return every attraction with how many of its activities the user can see, including zero."""
    # The condition goes in the join, not in a WHERE: a WHERE would drop the attractions whose
    # activities are all hidden, instead of counting zero for them
    rows = db.execute(
        select(Attraction, func.count(Activity.id))
        .outerjoin(Activity, and_(Activity.attraction_id == Attraction.id, visible_to(viewer)))
        .group_by(Attraction.id)
        .order_by(Attraction.id)
    )
    return [(attraction, count) for attraction, count in rows]
