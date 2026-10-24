"""Itinerary service."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.itinerary import Itinerary
from app.models.status import ItineraryStatus
from app.schemas.itinerary import ItineraryCreate, ItineraryUpdate


def list_itineraries(db: Session, status: ItineraryStatus | None = None) -> list[Itinerary]:
    """Return all itineraries, optionally only those with the given status."""
    statement = select(Itinerary)
    if status is not None:
        statement = statement.where(Itinerary.status == status)
    return list(db.scalars(statement))


def get_itinerary(db: Session, itinerary_id: int) -> Itinerary | None:
    """Return an itinerary by id, or None if it doesn't exist."""
    return db.get(Itinerary, itinerary_id)


def create_itinerary(db: Session, data: ItineraryCreate) -> Itinerary:
    """Create and persist a new itinerary."""
    itinerary = Itinerary(**data.model_dump())
    db.add(itinerary)
    db.commit()
    db.refresh(itinerary)
    return itinerary


def update_itinerary(db: Session, itinerary: Itinerary, data: ItineraryUpdate) -> Itinerary:
    """Apply partial updates to an existing itinerary."""
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(itinerary, field, value)
    db.commit()
    db.refresh(itinerary)
    return itinerary


def delete_itinerary(db: Session, itinerary: Itinerary) -> None:
    """Delete an itinerary."""
    db.delete(itinerary)
    db.commit()
