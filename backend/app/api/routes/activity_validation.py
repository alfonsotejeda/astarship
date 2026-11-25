"""ActivityValidation routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_admin
from app.db.session import get_db
from app.models.user.user import User
from app.schemas.activity import ActivityRead
from app.schemas.activity_validation import ActivityValidationCreate, ActivityValidationRead
from app.services import activity as activity_service
from app.services import activity_validation as validation_service

router = APIRouter(
    prefix="/activities/{activity_id}/validations", tags=["activity-validations"]
)


def _get_activity_or_404(db: Session, activity_id: int):
    """Return the activity or raise a 404."""
    activity = activity_service.get_activity(db, activity_id)
    if activity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    return activity


@router.get("", response_model=list[ActivityValidationRead])
def list_validations(
    activity_id: int, db: Session = Depends(get_db)
) -> list[ActivityValidationRead]:
    """List the validations of an activity, the most recent first."""
    _get_activity_or_404(db, activity_id)
    return validation_service.list_validations(db, activity_id)


@router.post("", response_model=ActivityRead, status_code=status.HTTP_201_CREATED)
def create_validation(
    activity_id: int,
    data: ActivityValidationCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> ActivityRead:
    """Validate an activity as the logged-in admin and return it with its new status."""
    activity = _get_activity_or_404(db, activity_id)
    try:
        validation_service.create_validation(db, activity, admin.id, data)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    return activity
