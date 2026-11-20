"""Tests for the ModificationRequest model."""

from datetime import date, datetime

import pytest
from sqlalchemy import Date
from sqlalchemy.exc import IntegrityError, StatementError

from app.models.assignment import Assignment
from app.models.itinerary import Itinerary
from app.models.modification_request import ModificationRequest
from app.models.status import ModificationRequestStatus
from app.models.user.admin import Admin
from app.models.user.guide import Guide
from app.models.user.tourist import Tourist
from app.models.user.user import User

ASSIGNMENT_DATE = date(2026, 3, 1)


def _add_assignment_and_guide(db_session, owners) -> tuple[Assignment, Guide]:
    itinerary = Itinerary(creation_date=date(2026, 1, 1), activity_count=1, **owners)
    tourist_user = User(name="Ada", email="ada@example.com", password_hash="x")
    tourist_user.tourist = Tourist(age=30)
    admin_user = User(name="Ana", email="ana@example.com", password_hash="x")
    admin_user.admin = Admin()
    guide_user = User(name="Gus", email="gus@example.com", password_hash="x")
    guide_user.guide = Guide(specialty="history")
    db_session.add_all([itinerary, tourist_user, admin_user, guide_user])
    db_session.flush()
    assignment = Assignment(
        itinerary_id=itinerary.id,
        tourist_id=tourist_user.id,
        assignment_date=ASSIGNMENT_DATE,
        admin_id=admin_user.id,
    )
    db_session.add(assignment)
    db_session.flush()
    return assignment, guide_user.guide


def _request(assignment, guide, **overrides):
    values = {
        "itinerary_id": assignment.itinerary_id,
        "tourist_id": assignment.tourist_id,
        "assignment_date": assignment.assignment_date,
        "guide_id": guide.id,
        "description": "Swap the museum visit",
        **overrides,
    }
    return ModificationRequest(**values)


def test_table_name():
    assert ModificationRequest.__tablename__ == "modification_requests"


def test_primary_key_is_assignment_guide_and_request_date():
    assert {c.name for c in ModificationRequest.__table__.primary_key} == {
        "itinerary_id",
        "tourist_id",
        "assignment_date",
        "guide_id",
        "request_date",
    }


def test_assignment_date_is_a_date():
    assert isinstance(ModificationRequest.__table__.c.assignment_date.type, Date)


def test_foreign_keys():
    constraints = {
        tuple(fk.column_keys): {element.target_fullname for element in fk.elements}
        for fk in ModificationRequest.__table__.foreign_key_constraints
    }

    assert constraints == {
        ("itinerary_id", "tourist_id", "assignment_date"): {
            "assignments.itinerary_id",
            "assignments.tourist_id",
            "assignments.assignment_date",
        },
        ("guide_id",): {"guides.id"},
    }


def test_result_is_optional():
    assert ModificationRequest.__table__.c.result.nullable
    assert not ModificationRequest.__table__.c.description.nullable


def test_defaults_to_requested_now(db_session, itinerary_owners):
    assignment, guide = _add_assignment_and_guide(db_session, itinerary_owners)
    before = datetime.now()
    modification_request = _request(assignment, guide)
    db_session.add(modification_request)
    db_session.flush()

    assert modification_request.status is ModificationRequestStatus.REQUESTED
    assert before <= modification_request.request_date <= datetime.now()
    assert modification_request.result is None


def test_several_requests_of_the_same_assignment_and_guide_are_allowed(
    db_session, itinerary_owners
):
    assignment, guide = _add_assignment_and_guide(db_session, itinerary_owners)
    db_session.add_all(
        [
            _request(assignment, guide, request_date=datetime(2026, 5, 1)),
            _request(assignment, guide, request_date=datetime(2026, 5, 2)),
        ]
    )

    db_session.flush()


def test_the_assignment_date_must_match_an_assignment(db_session, itinerary_owners):
    assignment, guide = _add_assignment_and_guide(db_session, itinerary_owners)
    db_session.add(_request(assignment, guide, assignment_date=date(2020, 1, 1)))

    with pytest.raises(IntegrityError):
        db_session.flush()


def test_unknown_status_is_rejected(db_session, itinerary_owners):
    assignment, guide = _add_assignment_and_guide(db_session, itinerary_owners)
    db_session.add(_request(assignment, guide, status="lost"))

    with pytest.raises((IntegrityError, StatementError)):
        db_session.flush()
