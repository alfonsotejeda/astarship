"""Tests for the Assignment model."""

from datetime import date

import pytest
from sqlalchemy.exc import IntegrityError, StatementError

from app.models.assignment import Assignment
from app.models.itinerary import Itinerary
from app.models.status import AssignmentStatus
from app.models.user.admin import Admin
from app.models.user.tourist import Tourist
from app.models.user.user import User


def _add_participants(db_session) -> tuple[Itinerary, Tourist, Admin]:
    itinerary = Itinerary(creation_date=date(2026, 1, 1), activity_count=1)
    tourist_user = User(name="Ada", email="ada@example.com", password_hash="x")
    tourist_user.tourist = Tourist(age=30)
    admin_user = User(name="Ana", email="ana@example.com", password_hash="x")
    admin_user.admin = Admin()
    db_session.add_all([itinerary, tourist_user, admin_user])
    db_session.flush()
    return itinerary, tourist_user.tourist, admin_user.admin


def test_table_name():
    assert Assignment.__tablename__ == "assignments"


def test_primary_key_is_itinerary_and_tourist():
    assert {c.name for c in Assignment.__table__.primary_key} == {"itinerary_id", "tourist_id"}


def test_foreign_keys():
    targets = {fk.target_fullname for fk in Assignment.__table__.foreign_keys}

    assert targets == {"itineraries.id", "tourists.id", "admins.id"}


def test_admin_is_required():
    assert not Assignment.__table__.c.admin_id.nullable


def test_defaults_to_assigned_today(db_session):
    itinerary, tourist, admin = _add_participants(db_session)
    assignment = Assignment(itinerary_id=itinerary.id, tourist_id=tourist.id, admin_id=admin.id)
    db_session.add(assignment)
    db_session.flush()

    assert assignment.status is AssignmentStatus.ASSIGNED
    assert assignment.assignment_date == date.today()


def test_unknown_status_is_rejected(db_session):
    itinerary, tourist, admin = _add_participants(db_session)
    db_session.add(
        Assignment(
            itinerary_id=itinerary.id, tourist_id=tourist.id, admin_id=admin.id, status="lost"
        )
    )

    with pytest.raises((IntegrityError, StatementError)):
        db_session.flush()
