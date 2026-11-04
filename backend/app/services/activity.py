"""Activity service."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.activity_type import ActivityType
from app.models.category import Category
from app.models.status import ReviewStatus
from app.models.user.guide import Guide
from app.schemas.activity import ActivityCreate, ActivityUpdate


def validate_activity_data(
    db: Session,
    *,
    category_id: int | None = None,
    guide_id: int | None = None,
    activity_type_code: str | None = None,
) -> None:
    """Validate the activity data, ensuring referenced entities exist."""
    if category_id is not None and db.get(Category, category_id) is None:
        raise LookupError("Category does not exist.")
    if guide_id is not None and db.get(Guide, guide_id) is None:
        raise LookupError("Guide does not exist.")
    if activity_type_code is not None and db.get(ActivityType, activity_type_code) is None:
        raise LookupError("Activity Type does not exist")


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
    validate_activity_data(
        db,
        category_id=data.category_id,
        guide_id=data.guide_id,
        activity_type_code=data.activity_type_code,
    )

    activity = Activity(**data.model_dump())
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


def update_activity(db: Session, activity: Activity, data: ActivityUpdate) -> Activity:
    """Apply partial updates to an existing activity."""
    changes = data.model_dump(exclude_unset=True)
    validate_activity_data(
        db,
        category_id=data.category_id,
        guide_id=data.guide_id,
        activity_type_code=data.activity_type_code,
    )
    for field, value in changes.items():
        setattr(activity, field, value)
    db.commit()
    db.refresh(activity)
    return activity


def delete_activity(db: Session, activity: Activity) -> None:
    """Delete an activity."""
    db.delete(activity)
    db.commit()


def activities_by_type(db: Session, activity_type_code: str) -> list[Activity]:
    """Return all activities of a specific type."""
    validate_activity_data(db, activity_type_code=activity_type_code)
    statement = (
        select(Activity)
        .where(Activity.activity_type_code == activity_type_code)
        .order_by(Activity.name)
    )
    return list(db.scalars(statement))
