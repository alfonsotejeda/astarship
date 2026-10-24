"""Assignment routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.assignment import Assignment
from app.schemas.assignment import AssignmentCreate, AssignmentRead, AssignmentUpdate
from app.services import assignment as assignment_service
from app.services import itinerary as itinerary_service
from app.services import user as user_service

router = APIRouter(tags=["assignments"])


def _ensure_itinerary_exists(db: Session, itinerary_id: int) -> None:
    """Raise a 404 if the itinerary doesn't exist."""
    if itinerary_service.get_itinerary(db, itinerary_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Itinerary not found")


def _ensure_tourist_exists(db: Session, tourist_id: int) -> None:
    """Raise a 404 if the tourist doesn't exist."""
    if user_service.get_tourist(db, tourist_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tourist not found")


def _get_assignment_or_404(db: Session, itinerary_id: int, tourist_id: int) -> Assignment:
    """Return the assignment or raise a 404."""
    assignment = assignment_service.get_assignment(db, itinerary_id, tourist_id)
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    return assignment


@router.get("/itineraries/{itinerary_id}/assignments", response_model=list[AssignmentRead])
def list_assignments(itinerary_id: int, db: Session = Depends(get_db)) -> list[AssignmentRead]:
    """List the tourists an itinerary is assigned to."""
    _ensure_itinerary_exists(db, itinerary_id)
    return assignment_service.list_assignments(db, itinerary_id)


@router.get("/users/{tourist_id}/assignments", response_model=list[AssignmentRead])
def list_tourist_assignments(
    tourist_id: int, db: Session = Depends(get_db)
) -> list[AssignmentRead]:
    """List the itineraries assigned to a tourist."""
    _ensure_tourist_exists(db, tourist_id)
    return assignment_service.list_tourist_assignments(db, tourist_id)


@router.post(
    "/itineraries/{itinerary_id}/assignments/{tourist_id}",
    response_model=AssignmentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_assignment(
    itinerary_id: int, tourist_id: int, data: AssignmentCreate, db: Session = Depends(get_db)
) -> AssignmentRead:
    """Assign an itinerary to a tourist."""
    _ensure_itinerary_exists(db, itinerary_id)
    _ensure_tourist_exists(db, tourist_id)
    if user_service.get_admin(db, data.admin_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
    if assignment_service.get_assignment(db, itinerary_id, tourist_id) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Itinerary already assigned to tourist"
        )
    return assignment_service.create_assignment(db, itinerary_id, tourist_id, data)


@router.patch(
    "/itineraries/{itinerary_id}/assignments/{tourist_id}", response_model=AssignmentRead
)
def update_assignment(
    itinerary_id: int, tourist_id: int, data: AssignmentUpdate, db: Session = Depends(get_db)
) -> AssignmentRead:
    """Update an assignment, typically to advance its status."""
    assignment = _get_assignment_or_404(db, itinerary_id, tourist_id)
    return assignment_service.update_assignment(db, assignment, data)


@router.delete(
    "/itineraries/{itinerary_id}/assignments/{tourist_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_assignment(itinerary_id: int, tourist_id: int, db: Session = Depends(get_db)) -> None:
    """Remove an itinerary from a tourist."""
    assignment = _get_assignment_or_404(db, itinerary_id, tourist_id)
    assignment_service.delete_assignment(db, assignment)
