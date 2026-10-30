"""Tests for the ActivityValidation model."""

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.exc import IntegrityError, StatementError

from app.models.activity import Activity
from app.models.activity_validation import ActivityValidation
from app.models.status import ValidationResult
from app.models.user.admin import Admin
from app.models.user.user import User


def _add_participants(db_session) -> tuple[Activity, Admin]:
    activity = Activity(name="Hiking", effort_level=3)
    user = User(name="Ana", email="ana@example.com", password_hash="x")
    user.admin = Admin()
    db_session.add_all([activity, user])
    db_session.flush()
    return activity, user.admin


def test_table_name():
    assert ActivityValidation.__tablename__ == "activity_validations"


def test_primary_key_is_activity_admin_and_date():
    assert {c.name for c in ActivityValidation.__table__.primary_key} == {
        "activity_id",
        "admin_id",
        "validation_date",
    }


def test_foreign_keys():
    targets = {fk.target_fullname for fk in ActivityValidation.__table__.foreign_keys}

    assert targets == {"activities.id", "admins.id"}


def test_date_is_a_timezone_aware_timestamp():
    assert ActivityValidation.__table__.c.validation_date.type.timezone


def test_result_is_required_and_observations_are_optional():
    columns = ActivityValidation.__table__.c

    assert not columns.result.nullable
    assert columns.observations.nullable


def test_date_defaults_to_now(db_session):
    activity, admin = _add_participants(db_session)
    before = datetime.now(UTC).replace(tzinfo=None) - timedelta(seconds=1)
    validation = ActivityValidation(
        activity_id=activity.id, admin_id=admin.id, result=ValidationResult.APPROVED
    )
    db_session.add(validation)
    db_session.flush()

    assert validation.validation_date.replace(tzinfo=None) >= before


def test_same_pair_can_validate_at_different_moments(db_session):
    activity, admin = _add_participants(db_session)
    first = datetime(2026, 1, 1, tzinfo=UTC)
    db_session.add_all(
        ActivityValidation(
            activity_id=activity.id,
            admin_id=admin.id,
            validation_date=first + timedelta(days=days),
            result=ValidationResult.REJECTED,
        )
        for days in range(2)
    )

    db_session.flush()


def test_same_pair_at_the_same_moment_is_rejected(db_session):
    activity, admin = _add_participants(db_session)
    moment = datetime(2026, 1, 1, tzinfo=UTC)
    db_session.add_all(
        ActivityValidation(
            activity_id=activity.id,
            admin_id=admin.id,
            validation_date=moment,
            result=ValidationResult.APPROVED,
        )
        for _ in range(2)
    )

    with pytest.raises(IntegrityError):
        db_session.flush()


def test_unknown_result_is_rejected(db_session):
    activity, admin = _add_participants(db_session)
    db_session.add(
        ActivityValidation(activity_id=activity.id, admin_id=admin.id, result="pending")
    )

    with pytest.raises((IntegrityError, StatementError)):
        db_session.flush()


def test_deleting_the_activity_deletes_its_validations(db_session):
    activity, admin = _add_participants(db_session)
    db_session.add(
        ActivityValidation(
            activity_id=activity.id, admin_id=admin.id, result=ValidationResult.APPROVED
        )
    )
    db_session.flush()

    db_session.delete(activity)
    db_session.flush()

    assert db_session.query(ActivityValidation).count() == 0
