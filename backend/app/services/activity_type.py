"""ActivityType service."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity_type import ActivityType
from app.schemas.activity_type import ActivityTypeCreate, ActivityTypeUpdate


def list_activity_types(db: Session) -> list[ActivityType]:
    """Return all activity types."""
    return list(db.scalars(select(ActivityType)))


def get_activity_type(db: Session, code: str) -> ActivityType | None:
    """Return an activity type by code, or None if it doesn't exist."""
    return db.get(ActivityType, code)


def create_activity_type(db: Session, data: ActivityTypeCreate) -> ActivityType:
    """Create and persist a new activity type."""
    activity_type = ActivityType(**data.model_dump())
    db.add(activity_type)
    db.commit()
    db.refresh(activity_type)
    return activity_type


def update_activity_type(
    db: Session, activity_type: ActivityType, data: ActivityTypeUpdate
) -> ActivityType:
    """Apply partial updates to an existing activity type."""
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(activity_type, field, value)
    db.commit()
    db.refresh(activity_type)
    return activity_type


def delete_activity_type(db: Session, activity_type: ActivityType) -> None:
    """Delete an activity type."""
    db.delete(activity_type)
    db.commit()
