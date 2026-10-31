"""ModificationRequest routes."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.modification_request import ModificationRequest
from app.schemas.modification_request import (
    ModificationRequestCreate,
    ModificationRequestRead,
    ModificationRequestUpdate,
)
from app.services import assignment as assignment_service
from app.services import modification_request as modification_request_service
from app.services import user as user_service

router = APIRouter(tags=["modification requests"])


def _ensure_assignment_exists(db: Session, itinerary_id: int, tourist_id: int) -> None:
    """Raise a 404 if the assignment doesn't exist."""
    if assignment_service.get_assignment(db, itinerary_id, tourist_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")


def _get_modification_request_or_404(
    db: Session, itinerary_id: int, tourist_id: int, guide_id: int, request_date: datetime
) -> ModificationRequest:
    """Return the modification request or raise a 404."""
    modification_request = modification_request_service.get_modification_request(
        db, itinerary_id, tourist_id, guide_id, request_date
    )
    if modification_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Modification request not found"
        )
    return modification_request


@router.get(
    "/itineraries/{itinerary_id}/assignments/{tourist_id}/modification-requests",
    response_model=list[ModificationRequestRead],
)
def list_modification_requests(
    itinerary_id: int, tourist_id: int, db: Session = Depends(get_db)
) -> list[ModificationRequestRead]:
    """List the modification requests of an assignment."""
    _ensure_assignment_exists(db, itinerary_id, tourist_id)
    return modification_request_service.list_modification_requests(db, itinerary_id, tourist_id)


@router.get("/users/{guide_id}/modification-requests", response_model=list[ModificationRequestRead])
def list_guide_modification_requests(
    guide_id: int, db: Session = Depends(get_db)
) -> list[ModificationRequestRead]:
    """List the modification requests handled by a guide."""
    if user_service.get_guide(db, guide_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")
    return modification_request_service.list_guide_modification_requests(db, guide_id)


@router.post(
    "/itineraries/{itinerary_id}/assignments/{tourist_id}/modification-requests",
    response_model=ModificationRequestRead,
    status_code=status.HTTP_201_CREATED,
)
def create_modification_request(
    itinerary_id: int,
    tourist_id: int,
    data: ModificationRequestCreate,
    db: Session = Depends(get_db),
) -> ModificationRequestRead:
    """Request a change in an assignment, handled by the travel group guide by default."""
    _ensure_assignment_exists(db, itinerary_id, tourist_id)
    guide_id = data.guide_id
    if guide_id is None:
        guide_id = modification_request_service.default_guide_id(db, tourist_id)
        if guide_id is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Tourist has no single travel group guide; guide_id is required",
            )
    elif user_service.get_guide(db, guide_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")
    if data.request_date is not None and (
        modification_request_service.get_modification_request(
            db, itinerary_id, tourist_id, guide_id, data.request_date
        )
        is not None
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Modification request already exists"
        )
    return modification_request_service.create_modification_request(
        db, itinerary_id, tourist_id, guide_id, data
    )


@router.patch(
    "/itineraries/{itinerary_id}/assignments/{tourist_id}/modification-requests/{guide_id}/{request_date}",
    response_model=ModificationRequestRead,
)
def update_modification_request(
    itinerary_id: int,
    tourist_id: int,
    guide_id: int,
    request_date: datetime,
    data: ModificationRequestUpdate,
    db: Session = Depends(get_db),
) -> ModificationRequestRead:
    """Update a modification request, typically to advance its status and record its result."""
    modification_request = _get_modification_request_or_404(
        db, itinerary_id, tourist_id, guide_id, request_date
    )
    return modification_request_service.update_modification_request(db, modification_request, data)


@router.delete(
    "/itineraries/{itinerary_id}/assignments/{tourist_id}/modification-requests/{guide_id}/{request_date}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_modification_request(
    itinerary_id: int,
    tourist_id: int,
    guide_id: int,
    request_date: datetime,
    db: Session = Depends(get_db),
) -> None:
    """Delete a modification request."""
    modification_request = _get_modification_request_or_404(
        db, itinerary_id, tourist_id, guide_id, request_date
    )
    modification_request_service.delete_modification_request(db, modification_request)
