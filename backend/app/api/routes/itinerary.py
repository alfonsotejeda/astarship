"""Itinerary routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.status import ItineraryStatus
from app.schemas.itinerary import ItineraryCreate, ItineraryRead, ItineraryUpdate
from app.services import itinerary as itinerary_service

router = APIRouter(prefix="/itineraries", tags=["itineraries"])


def _get_itinerary_or_404(db: Session, itinerary_id: int):
    """Return the itinerary or raise a 404."""
    itinerary = itinerary_service.get_itinerary(db, itinerary_id)
    if itinerary is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Itinerary not found")
    return itinerary


@router.get("", response_model=list[ItineraryRead])
def list_itineraries(
    status: ItineraryStatus | None = None, db: Session = Depends(get_db)
) -> list[ItineraryRead]:
    """List all itineraries, optionally filtered by status."""
    return itinerary_service.list_itineraries(db, status)


@router.get("/{itinerary_id}", response_model=ItineraryRead)
def get_itinerary(itinerary_id: int, db: Session = Depends(get_db)) -> ItineraryRead:
    """Get a single itinerary by id."""
    return _get_itinerary_or_404(db, itinerary_id)


@router.post("", response_model=ItineraryRead, status_code=status.HTTP_201_CREATED)
def create_itinerary(data: ItineraryCreate, db: Session = Depends(get_db)) -> ItineraryRead:
    """Create a new itinerary."""
    return itinerary_service.create_itinerary(db, data)


@router.patch("/{itinerary_id}", response_model=ItineraryRead)
def update_itinerary(
    itinerary_id: int, data: ItineraryUpdate, db: Session = Depends(get_db)
) -> ItineraryRead:
    """Update an existing itinerary."""
    itinerary = _get_itinerary_or_404(db, itinerary_id)
    return itinerary_service.update_itinerary(db, itinerary, data)


@router.delete("/{itinerary_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_itinerary(itinerary_id: int, db: Session = Depends(get_db)) -> None:
    """Delete an itinerary."""
    itinerary = _get_itinerary_or_404(db, itinerary_id)
    itinerary_service.delete_itinerary(db, itinerary)
