"""ProportionType service."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.proportion_type import ProportionType
from app.schemas.proportion_type import ProportionTypeCreate, ProportionTypeUpdate


def list_proportion_types(db: Session, itinerary_id: int) -> list[ProportionType]:
    """Return all activity type proportions of an itinerary."""
    statement = select(ProportionType).where(ProportionType.itinerary_id == itinerary_id)
    return list(db.scalars(statement))


def get_proportion_type(
    db: Session, itinerary_id: int, activity_type_code: str
) -> ProportionType | None:
    """Return the proportion of an activity type on an itinerary, or None if it doesn't exist."""
    return db.get(ProportionType, (itinerary_id, activity_type_code))


def create_proportion_type(
    db: Session, itinerary_id: int, activity_type_code: str, data: ProportionTypeCreate
) -> ProportionType:
    """Assign a proportion of an activity type to an itinerary."""
    proportion_type = ProportionType(
        itinerary_id=itinerary_id, activity_type_code=activity_type_code, value=data.value
    )
    db.add(proportion_type)
    db.commit()
    db.refresh(proportion_type)
    return proportion_type


def update_proportion_type(
    db: Session, proportion_type: ProportionType, data: ProportionTypeUpdate
) -> ProportionType:
    """Replace the value of an existing proportion."""
    proportion_type.value = data.value
    db.commit()
    db.refresh(proportion_type)
    return proportion_type


def delete_proportion_type(db: Session, proportion_type: ProportionType) -> None:
    """Remove an activity type's proportion from an itinerary."""
    db.delete(proportion_type)
    db.commit()
