"""ActivityValidation service."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.activity_validation import ActivityValidation
from app.models.status import ReviewStatus, ValidationResult
from app.schemas.activity_validation import ActivityValidationCreate

_STATUS_BY_RESULT = {
    ValidationResult.APPROVED: ReviewStatus.APPROVED,
    ValidationResult.REJECTED: ReviewStatus.REJECTED,
}


def list_validations(db: Session, activity_id: int) -> list[ActivityValidation]:
    """Return the validations of an activity, the most recent first."""
    statement = (
        select(ActivityValidation)
        .where(ActivityValidation.activity_id == activity_id)
        .order_by(ActivityValidation.validation_date.desc())
    )
    return list(db.scalars(statement))


def admin_has_validations(db: Session, admin_id: int) -> bool:
    """Return whether the admin has validated at least one activity."""
    query = select(ActivityValidation.activity_id).where(
        ActivityValidation.admin_id == admin_id
    ).limit(1)
    return db.scalar(query) is not None


def create_validation(
    db: Session, activity: Activity, admin_id: int, data: ActivityValidationCreate
) -> ActivityValidation:
    """Record the admin's validation and move the activity to the status its result decides.

    Both changes are committed together, so an activity never changes status without a
    validation to explain it. Only a pending activity can be reviewed: a rejected one comes
    back once its guide corrects it.
    """
    if activity.status is not ReviewStatus.PENDING:
        raise ValueError("Only a pending activity can be validated.")
    validation = ActivityValidation(activity_id=activity.id, admin_id=admin_id, **data.model_dump())
    db.add(validation)
    activity.status = _STATUS_BY_RESULT[data.result]
    db.commit()
    db.refresh(validation)
    return validation
