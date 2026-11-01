"""ActivityType routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.activity_type import ActivityTypeCreate, ActivityTypeRead, ActivityTypeUpdate
from app.services import activity_type as activity_type_service

router = APIRouter(prefix="/activity-types", tags=["activity-types"])


def _get_activity_type_or_404(db: Session, code: str):
    """Return the activity type or raise a 404."""
    activity_type = activity_type_service.get_activity_type(db, code)
    if activity_type is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ActivityType not found")
    return activity_type


@router.get("", response_model=list[ActivityTypeRead])
def list_activity_types(db: Session = Depends(get_db)) -> list[ActivityTypeRead]:
    """List all activity types."""
    return activity_type_service.list_activity_types(db)


@router.get("/{code}", response_model=ActivityTypeRead)
def get_activity_type(code: str, db: Session = Depends(get_db)) -> ActivityTypeRead:
    """Get a single activity type by code."""
    return _get_activity_type_or_404(db, code)


@router.post("", response_model=ActivityTypeRead, status_code=status.HTTP_201_CREATED)
def create_activity_type(
    data: ActivityTypeCreate, db: Session = Depends(get_db)
) -> ActivityTypeRead:
    """Create a new activity type."""
    return activity_type_service.create_activity_type(db, data)


@router.patch("/{code}", response_model=ActivityTypeRead)
def update_activity_type(
    code: str, data: ActivityTypeUpdate, db: Session = Depends(get_db)
) -> ActivityTypeRead:
    """Update an existing activity type."""
    activity_type = _get_activity_type_or_404(db, code)
    return activity_type_service.update_activity_type(db, activity_type, data)


@router.delete("/{code}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity_type(code: str, db: Session = Depends(get_db)) -> None:
    """Delete an activity type."""
    activity_type = _get_activity_type_or_404(db, code)
    activity_type_service.delete_activity_type(db, activity_type)
