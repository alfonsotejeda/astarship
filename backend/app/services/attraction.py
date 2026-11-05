"""Attraction service."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.attraction import Attraction
from app.schemas.attraction import AttractionCreate, AttractionUpdate


def list_attractions(db: Session) -> list[Attraction]:
    """Return all attractions ordered by id."""
    return list(db.scalars(select(Attraction).order_by(Attraction.id)))


def get_attraction(db: Session, attraction_id: int) -> Attraction | None:
    """Return an attraction by id, or None if it doesn't exist."""
    return db.get(Attraction, attraction_id)


def create_attraction(db: Session, data: AttractionCreate) -> Attraction:
    """Create and persist a new attraction."""
    attraction = Attraction(**data.model_dump())
    db.add(attraction)
    db.commit()
    db.refresh(attraction)
    return attraction


def update_attraction(db: Session, attraction: Attraction, data: AttractionUpdate) -> Attraction:
    """Apply partial updates to an existing attraction."""
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(attraction, field, value)
    db.commit()
    db.refresh(attraction)
    return attraction


def delete_attraction(db: Session, attraction: Attraction) -> None:
    """Delete an attraction."""
    if attraction.activities:
        raise ValueError("Attraction still has activities")
    db.delete(attraction)
    db.commit()


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
