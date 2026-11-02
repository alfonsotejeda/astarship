"""Attraction service."""

from sqlalchemy import select
from sqlalchemy.orm import Session

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


def update_attraction(
    db: Session, attraction: Attraction, data: AttractionUpdate
) -> Attraction:
    """Apply partial updates to an existing attraction."""
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(attraction, field, value)
    db.commit()
    db.refresh(attraction)
    return attraction


def delete_attraction(db: Session, attraction: Attraction) -> None:
    """Delete an attraction."""
    db.delete(attraction)
    db.commit()
