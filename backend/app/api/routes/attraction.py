"""Attraction routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_admin
from app.db.session import get_db
from app.models.user.user import User
from app.schemas.activity import ActivityRead
from app.schemas.attraction import (
    AttractionCreate,
    AttractionDetail,
    AttractionRead,
    AttractionSummary,
    AttractionUpdate,
)
from app.services import attraction as attraction_service

router = APIRouter(prefix="/attractions", tags=["attractions"])


def _get_attraction_or_404(db: Session, attraction_id: int):
    """Return the attraction or raise a 404."""
    attraction = attraction_service.get_attraction(db, attraction_id)
    if attraction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attraction not found")
    return attraction


@router.get("", response_model=list[AttractionSummary])
def list_attractions(
    db: Session = Depends(get_db), viewer: User = Depends(get_current_user)
) -> list[AttractionSummary]:
    """List all attractions with how many activities the user can see at each one."""
    return attraction_service.list_summaries(db, viewer)


@router.get("/count_activities_by_attraction", response_model=list[tuple[AttractionRead, int]])
def activities_count_by_attraction(
    db: Session = Depends(get_db), viewer: User = Depends(get_current_user)
):
    """Get how many activities the user can see at each attraction."""
    return attraction_service.activities_count_by_attractions(db, viewer)


@router.get("/activities_by_attraction/{attraction_id}", response_model=list[ActivityRead])
def get_activities_by_attraction(
    attraction_id: int, db: Session = Depends(get_db), viewer: User = Depends(get_current_user)
):
    """Get the activities of an attraction that the user can see."""
    try:
        return attraction_service.activities_by_attraction(db, attraction_id, viewer)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error


@router.get("/{attraction_id}", response_model=AttractionDetail)
def get_attraction(
    attraction_id: int, db: Session = Depends(get_db), viewer: User = Depends(get_current_user)
) -> AttractionDetail:
    """Get an attraction with the activities the user can see and its connections."""
    attraction = _get_attraction_or_404(db, attraction_id)
    return attraction_service.get_detail(db, attraction, viewer)


@router.post(
    "",
    response_model=AttractionRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_attraction(data: AttractionCreate, db: Session = Depends(get_db)) -> AttractionRead:
    """Create a new attraction."""
    return attraction_service.create_attraction(db, data)


@router.patch(
    "/{attraction_id}", response_model=AttractionRead, dependencies=[Depends(require_admin)]
)
def update_attraction(
    attraction_id: int, data: AttractionUpdate, db: Session = Depends(get_db)
) -> AttractionRead:
    """Update an existing attraction."""
    attraction = _get_attraction_or_404(db, attraction_id)
    return attraction_service.update_attraction(db, attraction, data)


@router.delete(
    "/{attraction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_attraction(attraction_id: int, db: Session = Depends(get_db)) -> None:
    """Delete an attraction."""
    attraction = _get_attraction_or_404(db, attraction_id)
    try:
        attraction_service.delete_attraction(db, attraction)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
