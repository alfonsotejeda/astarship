"""TravelGroup service."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.travel_group import TravelGroup
from app.schemas.travel_group import TravelGroupCreate, TravelGroupUpdate


def list_travel_groups(db: Session) -> list[TravelGroup]:
    """Return all travel groups."""
    return list(db.scalars(select(TravelGroup)))


def guide_attends_travel_groups(db: Session, guide_id: int) -> bool:
    """Return whether the guide attends at least one travel group."""
    query = select(TravelGroup.id).where(TravelGroup.guide_id == guide_id).limit(1)
    return db.scalar(query) is not None


def get_travel_group(db: Session, travel_group_id: int) -> TravelGroup | None:
    """Return a travel group by id, or None if it doesn't exist."""
    return db.get(TravelGroup, travel_group_id)


def create_travel_group(db: Session, data: TravelGroupCreate) -> TravelGroup:
    """Create and persist a new travel group."""
    travel_group = TravelGroup(**data.model_dump())
    db.add(travel_group)
    db.commit()
    db.refresh(travel_group)
    return travel_group


def update_travel_group(
    db: Session, travel_group: TravelGroup, data: TravelGroupUpdate
) -> TravelGroup:
    """Apply partial updates to an existing travel group."""
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(travel_group, field, value)
    db.commit()
    db.refresh(travel_group)
    return travel_group


def delete_travel_group(db: Session, travel_group: TravelGroup) -> None:
    """Delete a travel group."""
    db.delete(travel_group)
    db.commit()
