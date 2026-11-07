"""ActivityValidation routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.activity_validation import ActivityValidationCreate, ActivityValidationRead
from app.services import activity as activity_service
from app.services import activity_validation as validation_service
from app.services import user as user_service

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


@router.post("", response_model=ActivityValidationRead, status_code=status.HTTP_201_CREATED)
def create_validation(
    activity_id: int, data: ActivityValidationCreate, db: Session = Depends(get_db)
) -> ActivityValidationRead:
    """Validate an activity; its status becomes approved or rejected."""
    activity = _get_activity_or_404(db, activity_id)
    if user_service.get_admin(db, data.admin_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
    return validation_service.create_validation(db, activity, data)
