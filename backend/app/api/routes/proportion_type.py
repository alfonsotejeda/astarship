"""ProportionType routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.rules import require_itinerary_author
from app.db.session import get_db
from app.models.proportion_type import ProportionType
from app.schemas.proportion_type import (
    ProportionTypeCreate,
    ProportionTypeRead,
    ProportionTypeUpdate,
)
from app.services import activity_type as activity_type_service
from app.services import itinerary as itinerary_service
from app.services import proportion_type as proportion_type_service

router = APIRouter(
    prefix="/itineraries/{itinerary_id}/proportion-types", tags=["proportion-types"]
)


def _ensure_itinerary_exists(db: Session, itinerary_id: int) -> None:
    """Raise a 404 if the itinerary doesn't exist."""
    if itinerary_service.get_itinerary(db, itinerary_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Itinerary not found")


def _get_proportion_type_or_404(
    db: Session, itinerary_id: int, activity_type_code: str
) -> ProportionType:
    """Return the proportion or raise a 404."""
    proportion_type = proportion_type_service.get_proportion_type(
        db, itinerary_id, activity_type_code
    )
    if proportion_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="ProportionType not found"
        )
    return proportion_type


@router.get("", response_model=list[ProportionTypeRead])
def list_proportion_types(
    itinerary_id: int, db: Session = Depends(get_db)
) -> list[ProportionTypeRead]:
    """List the activity type proportions of an itinerary."""
    _ensure_itinerary_exists(db, itinerary_id)
    return proportion_type_service.list_proportion_types(db, itinerary_id)


@router.post(
    "/{activity_type_code}",
    response_model=ProportionTypeRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_itinerary_author)],
)
def create_proportion_type(
    itinerary_id: int,
    activity_type_code: str,
    data: ProportionTypeCreate,
    db: Session = Depends(get_db),
) -> ProportionTypeRead:
    """Assign an activity type's proportion to an itinerary."""
    _ensure_itinerary_exists(db, itinerary_id)
    if activity_type_service.get_activity_type(db, activity_type_code) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="ActivityType not found"
        )
    existing = proportion_type_service.get_proportion_type(db, itinerary_id, activity_type_code)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="ActivityType already has a proportion in itinerary",
        )
    return proportion_type_service.create_proportion_type(
        db, itinerary_id, activity_type_code, data
    )


@router.patch(
    "/{activity_type_code}",
    response_model=ProportionTypeRead,
    dependencies=[Depends(require_itinerary_author)],
)
def update_proportion_type(
    itinerary_id: int,
    activity_type_code: str,
    data: ProportionTypeUpdate,
    db: Session = Depends(get_db),
) -> ProportionTypeRead:
    """Update an activity type's proportion on an itinerary."""
    proportion_type = _get_proportion_type_or_404(db, itinerary_id, activity_type_code)
    return proportion_type_service.update_proportion_type(db, proportion_type, data)


@router.delete(
    "/{activity_type_code}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_itinerary_author)],
)
def delete_proportion_type(
    itinerary_id: int, activity_type_code: str, db: Session = Depends(get_db)
) -> None:
    """Remove an activity type's proportion from an itinerary."""
    proportion_type = _get_proportion_type_or_404(db, itinerary_id, activity_type_code)
    proportion_type_service.delete_proportion_type(db, proportion_type)
