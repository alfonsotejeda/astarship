"""Activity service."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.status import ReviewStatus
from app.schemas.activity import ActivityCreate, ActivityUpdate


def list_activities(db: Session, status: ReviewStatus | None = None) -> list[Activity]:
    """Return all activities, optionally only those with the given status."""
    statement = select(Activity)
    if status is not None:
        statement = statement.where(Activity.status == status)
    return list(db.scalars(statement))


def get_activity(db: Session, activity_id: int) -> Activity | None:
    """Return an activity by id, or None if it doesn't exist."""
    return db.get(Activity, activity_id)


def create_activity(db: Session, data: ActivityCreate) -> Activity:
    """Create and persist a new activity."""
    activity = Activity(**data.model_dump())
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


def update_activity(db: Session, activity: Activity, data: ActivityUpdate) -> Activity:
    """Apply partial updates to an existing activity."""
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(activity, field, value)
    db.commit()
    db.refresh(activity)
    return activity


def delete_activity(db: Session, activity: Activity) -> None:
    """Delete an activity."""
    db.delete(activity)
    db.commit()
