"""Tests for the ModificationRequest model."""

from datetime import date, datetime

import pytest
from sqlalchemy.exc import IntegrityError, StatementError

from app.models.assignment import Assignment
from app.models.itinerary import Itinerary
from app.models.modification_request import ModificationRequest
from app.models.status import ModificationRequestStatus
from app.models.user.admin import Admin
from app.models.user.guide import Guide
from app.models.user.tourist import Tourist
from app.models.user.user import User


def _add_assignment_and_guide(db_session) -> tuple[Assignment, Guide]:
    itinerary = Itinerary(creation_date=date(2026, 1, 1), activity_count=1)
    tourist_user = User(name="Ada", email="ada@example.com", password_hash="x")
    tourist_user.tourist = Tourist(age=30)
    admin_user = User(name="Ana", email="ana@example.com", password_hash="x")
    admin_user.admin = Admin()
    guide_user = User(name="Gus", email="gus@example.com", password_hash="x")
    guide_user.guide = Guide(specialty="history")
    db_session.add_all([itinerary, tourist_user, admin_user, guide_user])
    db_session.flush()
    assignment = Assignment(
        itinerary_id=itinerary.id, tourist_id=tourist_user.id, admin_id=admin_user.id
    )
    db_session.add(assignment)
    db_session.flush()
    return assignment, guide_user.guide


def test_table_name():
    assert ModificationRequest.__tablename__ == "modification_requests"


def test_primary_key_is_assignment_guide_and_request_date():
    assert {c.name for c in ModificationRequest.__table__.primary_key} == {
        "itinerary_id",
        "tourist_id",
        "guide_id",
        "request_date",
    }


def test_foreign_keys():
    constraints = {
        tuple(fk.column_keys): {element.target_fullname for element in fk.elements}
        for fk in ModificationRequest.__table__.foreign_key_constraints
    }

    assert constraints == {
        ("itinerary_id", "tourist_id"): {"assignments.itinerary_id", "assignments.tourist_id"},
        ("guide_id",): {"guides.id"},
    }


def test_result_is_optional():
    assert ModificationRequest.__table__.c.result.nullable
    assert not ModificationRequest.__table__.c.description.nullable


def test_defaults_to_requested_now(db_session):
    assignment, guide = _add_assignment_and_guide(db_session)
    before = datetime.now()
    modification_request = ModificationRequest(
        itinerary_id=assignment.itinerary_id,
        tourist_id=assignment.tourist_id,
        guide_id=guide.id,
        description="Swap the museum visit",
    )
    db_session.add(modification_request)
    db_session.flush()

    assert modification_request.status is ModificationRequestStatus.REQUESTED
    assert before <= modification_request.request_date <= datetime.now()
    assert modification_request.result is None


def test_unknown_status_is_rejected(db_session):
    assignment, guide = _add_assignment_and_guide(db_session)
    db_session.add(
        ModificationRequest(
            itinerary_id=assignment.itinerary_id,
            tourist_id=assignment.tourist_id,
            guide_id=guide.id,
            description="Swap the museum visit",
            status="lost",
        )
    )

    with pytest.raises((IntegrityError, StatementError)):
        db_session.flush()
