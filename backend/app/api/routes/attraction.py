"""Attraction routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_admin
from app.db.session import get_db
from app.schemas.attraction import AttractionCreate, AttractionRead, AttractionUpdate
from app.services import attraction as attraction_service

router = APIRouter(prefix="/attractions", tags=["attractions"])


def _get_attraction_or_404(db: Session, attraction_id: int):
    """Return the attraction or raise a 404."""
    attraction = attraction_service.get_attraction(db, attraction_id)
    if attraction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attraction not found")
    return attraction


@router.get("", response_model=list[AttractionRead])
def list_attractions(db: Session = Depends(get_db)) -> list[AttractionRead]:
    """List all attractions."""
    return attraction_service.list_attractions(db)


@router.get("/{attraction_id}", response_model=AttractionRead)
def get_attraction(attraction_id: int, db: Session = Depends(get_db)) -> AttractionRead:
    """Get a single attraction by id."""
    return _get_attraction_or_404(db, attraction_id)


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
    attraction_service.delete_attraction(db, attraction)
