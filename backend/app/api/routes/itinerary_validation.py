"""Itinerary validation routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.itinerary_validation import ItineraryValidation
from app.schemas.itinerary_validation import ItineraryValidationCreate, ItineraryValidationRead
from app.services import itinerary_validation as service

router = APIRouter(
    prefix="/itineraries/{itinerary_id}/validations",
    tags=["itinerary validations"],)

@router.get("", response_model=list[ItineraryValidationRead])
def list_validations(itinerary_id: int, db: Session = Depends(get_db)) -> list[ItineraryValidation]:
    """Return the validations of an itinerary, oldest first."""
    try:
        return service.validations_by_itinerary(itinerary_id, db)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

@router.post("", response_model=ItineraryValidationRead, status_code=201)
def create_validation(itinerary_id: int, data: ItineraryValidationCreate, db: Session = Depends(get_db)) -> ItineraryValidation:
    """Validate an itinerary as a guide."""
    try:
        return service.create_validation(itinerary_id, data, db)
    except LookupError as exc: 
        raise HTTPException(status_code=404, detail= str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc