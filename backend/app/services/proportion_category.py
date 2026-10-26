"""ProportionCategory service."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.proportion_category import ProportionCategory
from app.schemas.proportion_category import ProportionCategoryCreate, ProportionCategoryUpdate


def list_proportion_categories(db: Session, itinerary_id: int) -> list[ProportionCategory]:
    """Return all category proportions of an itinerary."""
    statement = select(ProportionCategory).where(ProportionCategory.itinerary_id == itinerary_id)
    return list(db.scalars(statement))


def get_proportion_category(
    db: Session, itinerary_id: int, category_id: int
) -> ProportionCategory | None:
    """Return the proportion of a category on an itinerary, or None if it doesn't exist."""
    return db.get(ProportionCategory, (itinerary_id, category_id))


def create_proportion_category(
    db: Session, itinerary_id: int, category_id: int, data: ProportionCategoryCreate
) -> ProportionCategory:
    """Assign a proportion of a category to an itinerary."""
    proportion_category = ProportionCategory(
        itinerary_id=itinerary_id, category_id=category_id, value=data.value
    )
    db.add(proportion_category)
    db.commit()
    db.refresh(proportion_category)
    return proportion_category


def update_proportion_category(
    db: Session, proportion_category: ProportionCategory, data: ProportionCategoryUpdate
) -> ProportionCategory:
    """Replace the value of an existing proportion."""
    proportion_category.value = data.value
    db.commit()
    db.refresh(proportion_category)
    return proportion_category


def delete_proportion_category(db: Session, proportion_category: ProportionCategory) -> None:
    """Remove a category's proportion from an itinerary."""
    db.delete(proportion_category)
    db.commit()
