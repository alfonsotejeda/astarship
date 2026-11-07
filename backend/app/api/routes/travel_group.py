"""TravelGroup routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_admin
from app.db.session import get_db
from app.schemas.travel_group import TravelGroupCreate, TravelGroupRead, TravelGroupUpdate
from app.services import travel_group as travel_group_service
from app.services import user as user_service

router = APIRouter(prefix="/travel-groups", tags=["travel-groups"])


def _get_travel_group_or_404(db: Session, travel_group_id: int):
    """Return the travel group or raise a 404."""
    travel_group = travel_group_service.get_travel_group(db, travel_group_id)
    if travel_group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="TravelGroup not found"
        )
    return travel_group


def _ensure_guide_exists(db: Session, guide_id: int) -> None:
    """Raise a 404 if the guide doesn't exist."""
    if user_service.get_guide(db, guide_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")


@router.get("", response_model=list[TravelGroupRead])
def list_travel_groups(db: Session = Depends(get_db)) -> list[TravelGroupRead]:
    """List all travel groups."""
    return travel_group_service.list_travel_groups(db)


@router.get("/{travel_group_id}", response_model=TravelGroupRead)
def get_travel_group(travel_group_id: int, db: Session = Depends(get_db)) -> TravelGroupRead:
    """Get a single travel group by id."""
    return _get_travel_group_or_404(db, travel_group_id)


@router.post(
    "",
    response_model=TravelGroupRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_travel_group(
    data: TravelGroupCreate, db: Session = Depends(get_db)
) -> TravelGroupRead:
    """Create a new travel group."""
    _ensure_guide_exists(db, data.guide_id)
    return travel_group_service.create_travel_group(db, data)


@router.patch(
    "/{travel_group_id}", response_model=TravelGroupRead, dependencies=[Depends(require_admin)]
)
def update_travel_group(
    travel_group_id: int, data: TravelGroupUpdate, db: Session = Depends(get_db)
) -> TravelGroupRead:
    """Update an existing travel group."""
    travel_group = _get_travel_group_or_404(db, travel_group_id)
    if data.guide_id is not None:
        _ensure_guide_exists(db, data.guide_id)
    return travel_group_service.update_travel_group(db, travel_group, data)


@router.delete(
    "/{travel_group_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_travel_group(travel_group_id: int, db: Session = Depends(get_db)) -> None:
    """Delete a travel group."""
    travel_group = _get_travel_group_or_404(db, travel_group_id)
    travel_group_service.delete_travel_group(db, travel_group)
