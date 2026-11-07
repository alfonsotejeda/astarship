"""ItineraryComposition service."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.itinerary_composition import ItineraryComposition
from app.schemas.itinerary_composition import (
    ItineraryCompositionCreate,
    ItineraryCompositionUpdate,
)


def list_compositions(db: Session, itinerary_id: int) -> list[ItineraryComposition]:
    """Return the activities of an itinerary in visiting order."""
    statement = (
        select(ItineraryComposition)
        .where(ItineraryComposition.itinerary_id == itinerary_id)
        .order_by(ItineraryComposition.order)
    )
    return list(db.scalars(statement))


def get_composition(
    db: Session, itinerary_id: int, activity_id: int
) -> ItineraryComposition | None:
    """Return the placement of an activity in an itinerary, or None if it doesn't exist."""
    return db.get(ItineraryComposition, (itinerary_id, activity_id))


def create_composition(
    db: Session, itinerary_id: int, activity_id: int, data: ItineraryCompositionCreate
) -> ItineraryComposition:
    """Add an activity to an itinerary."""
    composition = ItineraryComposition(
        itinerary_id=itinerary_id, activity_id=activity_id, **data.model_dump()
    )
    db.add(composition)
    db.commit()
    db.refresh(composition)
    return composition


def update_composition(
    db: Session, composition: ItineraryComposition, data: ItineraryCompositionUpdate
) -> ItineraryComposition:
    """Apply partial updates to an activity's placement in an itinerary."""
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(composition, field, value)
    db.commit()
    db.refresh(composition)
    return composition


def delete_composition(db: Session, composition: ItineraryComposition) -> None:
    """Remove an activity from an itinerary."""
    db.delete(composition)
    db.commit()
