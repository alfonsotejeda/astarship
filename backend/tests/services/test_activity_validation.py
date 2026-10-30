"""Tests for the activity validation service."""

from app.models.status import ReviewStatus, ValidationResult
from app.schemas.activity import ActivityCreate
from app.schemas.activity_validation import ActivityValidationCreate
from app.schemas.user import AdminCreate
from app.services import activity as activity_service
from app.services import activity_validation as validation_service
from app.services import user as user_service


def _create_activity(db_session, name="Hiking"):
    return activity_service.create_activity(db_session, ActivityCreate(name=name, effort_level=3))


def _create_admin(db_session, email="ana@example.com"):
    return user_service.create_user(
        db_session, AdminCreate(name="Ana", role="admin", email=email, password="x")
    )


def _validate(db_session, activity, admin, result=ValidationResult.APPROVED, **fields):
    return validation_service.create_validation(
        db_session,
        activity,
        ActivityValidationCreate(admin_id=admin.id, result=result, **fields),
    )


def test_create_validation_records_the_review(db_session):
    activity = _create_activity(db_session)
    admin = _create_admin(db_session)

    validation = _validate(db_session, activity, admin, observations="Looks unique")

    assert validation.activity_id == activity.id
    assert validation.admin_id == admin.id
    assert validation.result is ValidationResult.APPROVED
    assert validation.observations == "Looks unique"
    assert validation.validation_date is not None


def test_approval_sets_the_activity_status_to_approved(db_session):
    activity = _create_activity(db_session)
    admin = _create_admin(db_session)

    _validate(db_session, activity, admin, ValidationResult.APPROVED)

    assert activity.status is ReviewStatus.APPROVED


def test_rejection_sets_the_activity_status_to_rejected(db_session):
    activity = _create_activity(db_session)
    admin = _create_admin(db_session)

    _validate(db_session, activity, admin, ValidationResult.REJECTED)

    assert activity.status is ReviewStatus.REJECTED


def test_revalidating_keeps_the_history_and_uses_the_latest_result(db_session):
    activity = _create_activity(db_session)
    admin = _create_admin(db_session)
    _validate(db_session, activity, admin, ValidationResult.REJECTED)

    _validate(db_session, activity, admin, ValidationResult.APPROVED)

    assert activity.status is ReviewStatus.APPROVED
    assert len(validation_service.list_validations(db_session, activity.id)) == 2


def test_list_validations_returns_the_most_recent_first(db_session):
    activity = _create_activity(db_session)
    admin = _create_admin(db_session)
    _validate(db_session, activity, admin, ValidationResult.REJECTED)
    _validate(db_session, activity, admin, ValidationResult.APPROVED)

    results = [v.result for v in validation_service.list_validations(db_session, activity.id)]

    assert results == [ValidationResult.APPROVED, ValidationResult.REJECTED]


def test_list_validations_is_empty_without_validations(db_session):
    activity = _create_activity(db_session)

    assert validation_service.list_validations(db_session, activity.id) == []


def test_admin_has_validations(db_session):
    activity = _create_activity(db_session)
    validator = _create_admin(db_session, "validator@example.com")
    idle = _create_admin(db_session, "idle@example.com")
    _validate(db_session, activity, validator)

    assert validation_service.admin_has_validations(db_session, validator.id)
    assert not validation_service.admin_has_validations(db_session, idle.id)
