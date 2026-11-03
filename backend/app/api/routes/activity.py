"""Activity routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_admin, require_guide
from app.db.session import get_db
from app.models.status import ReviewStatus
from app.schemas.activity import ActivityCreate, ActivityRead, ActivityUpdate
from app.services import activity as activity_service

router = APIRouter(prefix="/activities", tags=["activities"])


def _get_activity_or_404(db: Session, activity_id: int):
    """Return the activity or raise a 404."""
    activity = activity_service.get_activity(db, activity_id)
    if activity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    return activity


@router.get("", response_model=list[ActivityRead])
def list_activities(
    status: ReviewStatus | None = None, db: Session = Depends(get_db)
) -> list[ActivityRead]:
    """List all activities, optionally filtered by status."""
    return activity_service.list_activities(db, status)


@router.get("/{activity_id}", response_model=ActivityRead)
def get_activity(activity_id: int, db: Session = Depends(get_db)) -> ActivityRead:
    """Get a single activity by id."""
    return _get_activity_or_404(db, activity_id)


@router.post(
    "",
    response_model=ActivityRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_guide)],
)
def create_activity(data: ActivityCreate, db: Session = Depends(get_db)) -> ActivityRead:
    """Create a new activity."""
    return activity_service.create_activity(db, data)


@router.patch(
    "/{activity_id}", response_model=ActivityRead, dependencies=[Depends(require_guide)]
)
def update_activity(
    activity_id: int, data: ActivityUpdate, db: Session = Depends(get_db)
) -> ActivityRead:
    """Update an existing activity."""
    activity = _get_activity_or_404(db, activity_id)
    return activity_service.update_activity(db, activity, data)


@router.delete(
    "/{activity_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)]
)
def delete_activity(activity_id: int, db: Session = Depends(get_db)) -> None:
    """Delete an activity."""
    activity = _get_activity_or_404(db, activity_id)
    activity_service.delete_activity(db, activity)
