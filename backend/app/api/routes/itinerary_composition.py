"""ItineraryComposition routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.itinerary_composition import ItineraryComposition
from app.schemas.itinerary_composition import (
    ItineraryCompositionCreate,
    ItineraryCompositionRead,
    ItineraryCompositionUpdate,
)
from app.services import activity as activity_service
from app.services import itinerary as itinerary_service
from app.services import itinerary_composition as composition_service

router = APIRouter(
    prefix="/itineraries/{itinerary_id}/activities", tags=["itinerary-compositions"]
)


def _ensure_itinerary_exists(db: Session, itinerary_id: int) -> None:
    """Raise a 404 if the itinerary doesn't exist."""
    if itinerary_service.get_itinerary(db, itinerary_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Itinerary not found")


def _get_composition_or_404(
    db: Session, itinerary_id: int, activity_id: int
) -> ItineraryComposition:
    """Return the composition or raise a 404."""
    composition = composition_service.get_composition(db, itinerary_id, activity_id)
    if composition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="ItineraryComposition not found"
        )
    return composition


@router.get("", response_model=list[ItineraryCompositionRead])
def list_compositions(
    itinerary_id: int, db: Session = Depends(get_db)
) -> list[ItineraryCompositionRead]:
    """List the activities of an itinerary in visiting order."""
    _ensure_itinerary_exists(db, itinerary_id)
    return composition_service.list_compositions(db, itinerary_id)


@router.post(
    "/{activity_id}",
    response_model=ItineraryCompositionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_composition(
    itinerary_id: int,
    activity_id: int,
    data: ItineraryCompositionCreate,
    db: Session = Depends(get_db),
) -> ItineraryCompositionRead:
    """Add an activity to an itinerary."""
    _ensure_itinerary_exists(db, itinerary_id)
    if activity_service.get_activity(db, activity_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    if composition_service.get_composition(db, itinerary_id, activity_id) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Activity already in itinerary"
        )
    return composition_service.create_composition(db, itinerary_id, activity_id, data)


@router.patch("/{activity_id}", response_model=ItineraryCompositionRead)
def update_composition(
    itinerary_id: int,
    activity_id: int,
    data: ItineraryCompositionUpdate,
    db: Session = Depends(get_db),
) -> ItineraryCompositionRead:
    """Reschedule an activity within an itinerary."""
    composition = _get_composition_or_404(db, itinerary_id, activity_id)
    return composition_service.update_composition(db, composition, data)


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_composition(itinerary_id: int, activity_id: int, db: Session = Depends(get_db)) -> None:
    """Remove an activity from an itinerary."""
    composition = _get_composition_or_404(db, itinerary_id, activity_id)
    composition_service.delete_composition(db, composition)
