"""Activity service."""

from sqlalchemy import ColumnElement, Select, or_, select, true
from sqlalchemy.orm import Session, selectinload

from app.models.activity import Activity
from app.models.activity_type import ActivityType
from app.models.activity_validation import ActivityValidation
from app.models.attraction import Attraction
from app.models.category import Category
from app.models.status import ReviewStatus
from app.models.user.admin import Admin
from app.models.user.guide import Guide
from app.models.user.user import User, UserRole
from app.schemas.activity import ActivityCreate, ActivityUpdate


def select_for_read() -> Select[tuple[Activity]]:
    """Return a SELECT of activities that also brings everything ActivityRead shows.

    Without it each activity would fetch its attraction, author and last reviewer in queries
    of its own (N+1). selectinload fetches each of them once for all the activities.
    """
    return select(Activity).options(
        selectinload(Activity.attraction),
        selectinload(Activity.guide).selectinload(Guide.user),
        selectinload(Activity.validations)
        .selectinload(ActivityValidation.admin)
        .selectinload(Admin.user),
    )


def visible_to(viewer: User) -> ColumnElement[bool]:
    """Return the SQL condition of the activities a user can see (RNF-10).

    Everyone sees the approved ones, a guide also their own in any status, an admin all of them.
    """
    if viewer.role is UserRole.ADMIN:
        return true()
    approved = Activity.status == ReviewStatus.APPROVED
    if viewer.role is UserRole.GUIDE:
        return or_(approved, Activity.guide_id == viewer.id)
    return approved


def validate_activity_data(
    db: Session,
    *,
    category_id: int | None = None,
    guide_id: int | None = None,
    activity_type_code: str | None = None,
    attraction_id: int | None = None,
) -> None:
    """Validate the activity data, ensuring referenced entities exist."""
    if category_id is not None and db.get(Category, category_id) is None:
        raise LookupError("Category does not exist.")
    if guide_id is not None and db.get(Guide, guide_id) is None:
        raise LookupError("Guide does not exist.")
    if activity_type_code is not None and db.get(ActivityType, activity_type_code) is None:
        raise LookupError("Activity Type does not exist")
    if attraction_id is not None and db.get(Attraction, attraction_id) is None:
        raise LookupError("Attraction does not exist.")


def validate_unique_name(
    db: Session, name: str, attraction_id: int, exclude_id: int | None = None
) -> None:
    """Raise ValueError if the attraction already has an activity  with this name (RN - 03)."""
    statement = select(Activity.id).where(
        Activity.name == name, Activity.attraction_id == attraction_id
    )
    if exclude_id is not None:
        statement = statement.where(Activity.id != exclude_id)
    if db.scalars(statement).first() is not None:
        raise ValueError("Activity name already exists in this attraction.")


def list_activities(
    db: Session, viewer: User, status: ReviewStatus | None = None
) -> list[Activity]:
    """Return the activities the user can see, optionally only those with the given status."""
    statement = select_for_read().where(visible_to(viewer))
    if status is not None:
        statement = statement.where(Activity.status == status)
    return list(db.scalars(statement))


def get_activity(db: Session, activity_id: int) -> Activity | None:
    """Return an activity by id, or None if it doesn't exist."""
    return db.get(Activity, activity_id)


def get_visible_activity(db: Session, activity_id: int, viewer: User) -> Activity | None:
    """Return an activity by id, or None if it doesn't exist or the user can't see it."""
    statement = select_for_read().where(Activity.id == activity_id, visible_to(viewer))
    return db.scalars(statement).first()


def create_activity(db: Session, data: ActivityCreate) -> Activity:
    """Create and persist a new activity."""
    validate_activity_data(
        db,
        category_id=data.category_id,
        guide_id=data.guide_id,
        activity_type_code=data.activity_type_code,
        attraction_id=data.attraction_id,
    )

    validate_unique_name(db, data.name, data.attraction_id)
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
        attraction_id=data.attraction_id,
    )
    if "name" in changes or "attraction_id" in changes:
        validate_unique_name(
            db,
            changes.get("name", activity.name),
            changes.get("attraction_id", activity.attraction_id),
            exclude_id=activity.id,
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


def activities_by_type(db: Session, activity_type_code: str, viewer: User) -> list[Activity]:
    """Return the activities of a specific type that the user can see."""
    validate_activity_data(db, activity_type_code=activity_type_code)
    statement = (
        select_for_read()
        .where(Activity.activity_type_code == activity_type_code, visible_to(viewer))
        .order_by(Activity.name)
    )
    return list(db.scalars(statement))
