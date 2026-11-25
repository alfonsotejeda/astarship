"""Activity routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_admin, require_guide
from app.db.session import get_db
from app.models.status import ReviewStatus
from app.models.user.user import User
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
    status: ReviewStatus | None = None,
    db: Session = Depends(get_db),
    viewer: User = Depends(get_current_user),
) -> list[ActivityRead]:
    """List the activities the user can see, optionally filtered by status (RNF-10)."""
    return activity_service.list_activities(db, viewer, status)


@router.get("/{activity_id}", response_model=ActivityRead)
def get_activity(
    activity_id: int, db: Session = Depends(get_db), viewer: User = Depends(get_current_user)
) -> ActivityRead:
    """Get a single activity by id; one the user can't see is reported as missing (RNF-10)."""
    activity = activity_service.get_visible_activity(db, activity_id, viewer)
    if activity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    return activity


@router.post("", response_model=ActivityRead, status_code=status.HTTP_201_CREATED)
def create_activity(
    data: ActivityCreate,
    db: Session = Depends(get_db),
    guide: User = Depends(require_guide),
) -> ActivityRead:
    """Create a new activity whose author is the logged-in guide."""
    try:
        return activity_service.create_activity(db, data, guide.id)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error


@router.patch("/{activity_id}", response_model=ActivityRead, dependencies=[Depends(require_guide)])
def update_activity(
    activity_id: int, data: ActivityUpdate, db: Session = Depends(get_db)
) -> ActivityRead:
    """Update an existing activity."""
    activity = _get_activity_or_404(db, activity_id)
    try:
        return activity_service.update_activity(db, activity, data)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error


@router.delete(
    "/{activity_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)]
)
def delete_activity(activity_id: int, db: Session = Depends(get_db)) -> None:
    """Delete an activity."""
    activity = _get_activity_or_404(db, activity_id)
    activity_service.delete_activity(db, activity)


@router.get("/by_type/{activity_type_code}", response_model=list[ActivityRead])
def activities_by_type(
    activity_type_code: str,
    db: Session = Depends(get_db),
    viewer: User = Depends(get_current_user),
) -> list[ActivityRead]:
    """List the activities of a specific type that the user can see."""
    try:
        return activity_service.activities_by_type(db, activity_type_code, viewer)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
