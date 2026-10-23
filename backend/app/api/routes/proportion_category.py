"""ProportionCategory routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.proportion_category import ProportionCategory
from app.schemas.proportion_category import (
    ProportionCategoryCreate,
    ProportionCategoryRead,
    ProportionCategoryUpdate,
)
from app.services import category as category_service
from app.services import itinerary as itinerary_service
from app.services import proportion_category as proportion_category_service

router = APIRouter(
    prefix="/itineraries/{itinerary_id}/proportion-categories", tags=["proportion-categories"]
)


def _ensure_itinerary_exists(db: Session, itinerary_id: int) -> None:
    """Raise a 404 if the itinerary doesn't exist."""
    if itinerary_service.get_itinerary(db, itinerary_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Itinerary not found")


def _get_proportion_category_or_404(
    db: Session, itinerary_id: int, category_id: int
) -> ProportionCategory:
    """Return the proportion or raise a 404."""
    proportion_category = proportion_category_service.get_proportion_category(
        db, itinerary_id, category_id
    )
    if proportion_category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="ProportionCategory not found"
        )
    return proportion_category


@router.get("", response_model=list[ProportionCategoryRead])
def list_proportion_categories(
    itinerary_id: int, db: Session = Depends(get_db)
) -> list[ProportionCategoryRead]:
    """List the category proportions of an itinerary."""
    _ensure_itinerary_exists(db, itinerary_id)
    return proportion_category_service.list_proportion_categories(db, itinerary_id)


@router.post(
    "/{category_id}",
    response_model=ProportionCategoryRead,
    status_code=status.HTTP_201_CREATED,
)
def create_proportion_category(
    itinerary_id: int,
    category_id: int,
    data: ProportionCategoryCreate,
    db: Session = Depends(get_db),
) -> ProportionCategoryRead:
    """Assign a category's proportion to an itinerary."""
    _ensure_itinerary_exists(db, itinerary_id)
    if category_service.category_by_id(db, category_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    existing = proportion_category_service.get_proportion_category(db, itinerary_id, category_id)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category already has a proportion in itinerary",
        )
    return proportion_category_service.create_proportion_category(
        db, itinerary_id, category_id, data
    )


@router.patch("/{category_id}", response_model=ProportionCategoryRead)
def update_proportion_category(
    itinerary_id: int,
    category_id: int,
    data: ProportionCategoryUpdate,
    db: Session = Depends(get_db),
) -> ProportionCategoryRead:
    """Update a category's proportion on an itinerary."""
    proportion_category = _get_proportion_category_or_404(db, itinerary_id, category_id)
    return proportion_category_service.update_proportion_category(db, proportion_category, data)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_proportion_category(
    itinerary_id: int, category_id: int, db: Session = Depends(get_db)
) -> None:
    """Remove a category's proportion from an itinerary."""
    proportion_category = _get_proportion_category_or_404(db, itinerary_id, category_id)
    proportion_category_service.delete_proportion_category(db, proportion_category)
