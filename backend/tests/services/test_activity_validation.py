"""Tests for the activity validation service."""

import pytest

from app.models.status import ReviewStatus, ValidationResult
from app.schemas.activity import ActivityUpdate
from app.schemas.activity_validation import ActivityValidationCreate
from app.schemas.user import AdminCreate
from app.services import activity as activity_service
from app.services import activity_validation as validation_service
from app.services import user as user_service


def _create_admin(db_session, email="ana@example.com"):
    return user_service.create_user(
        db_session, AdminCreate(name="Ana", role="admin", email=email, password="x")
    )


def _validate(db_session, activity, admin, result=ValidationResult.APPROVED, **fields):
    return validation_service.create_validation(
        db_session,
        activity,
        admin.id,
        ActivityValidationCreate(result=result, **fields),
    )


def _correct(db_session, activity):
    """The guide edits the rejected activity, so it goes back to pending."""
    activity_service.update_activity(db_session, activity, ActivityUpdate(duration=90))


def test_create_validation_records_the_review(db_session, insert_activity):
    activity = insert_activity()
    admin = _create_admin(db_session)

    validation = _validate(db_session, activity, admin, observations="Looks unique")

    assert validation.activity_id == activity.id
    assert validation.admin_id == admin.id
    assert validation.result is ValidationResult.APPROVED
    assert validation.observations == "Looks unique"
    assert validation.validation_date is not None


def test_approval_sets_the_activity_status_to_approved(db_session, insert_activity):
    activity = insert_activity()
    admin = _create_admin(db_session)

    _validate(db_session, activity, admin, ValidationResult.APPROVED)

    assert activity.status is ReviewStatus.APPROVED


def test_rejection_sets_the_activity_status_to_rejected(db_session, insert_activity):
    activity = insert_activity()
    admin = _create_admin(db_session)

    _validate(db_session, activity, admin, ValidationResult.REJECTED)

    assert activity.status is ReviewStatus.REJECTED


def test_revalidating_keeps_the_history_and_uses_the_latest_result(db_session, insert_activity):
    activity = insert_activity()
    admin = _create_admin(db_session)
    _validate(db_session, activity, admin, ValidationResult.REJECTED)
    _correct(db_session, activity)

    _validate(db_session, activity, admin, ValidationResult.APPROVED)

    assert activity.status is ReviewStatus.APPROVED
    assert len(validation_service.list_validations(db_session, activity.id)) == 2


@pytest.mark.parametrize("first", [ValidationResult.APPROVED, ValidationResult.REJECTED])
def test_validating_an_activity_that_is_not_pending_raises(db_session, insert_activity, first):
    activity = insert_activity()
    admin = _create_admin(db_session)
    _validate(db_session, activity, admin, first)

    with pytest.raises(ValueError, match="pending"):
        _validate(db_session, activity, admin, ValidationResult.APPROVED)

    assert len(validation_service.list_validations(db_session, activity.id)) == 1


def test_list_validations_returns_the_most_recent_first(db_session, insert_activity):
    activity = insert_activity()
    admin = _create_admin(db_session)
    _validate(db_session, activity, admin, ValidationResult.REJECTED)
    _correct(db_session, activity)
    _validate(db_session, activity, admin, ValidationResult.APPROVED)

    results = [v.result for v in validation_service.list_validations(db_session, activity.id)]

    assert results == [ValidationResult.APPROVED, ValidationResult.REJECTED]


def test_list_validations_is_empty_without_validations(db_session, insert_activity):
    activity = insert_activity()

    assert validation_service.list_validations(db_session, activity.id) == []


def test_admin_has_validations(db_session, insert_activity):
    activity = insert_activity()
    validator = _create_admin(db_session, "validator@example.com")
    idle = _create_admin(db_session, "idle@example.com")
    _validate(db_session, activity, validator)

    assert validation_service.admin_has_validations(db_session, validator.id)
    assert not validation_service.admin_has_validations(db_session, idle.id)
