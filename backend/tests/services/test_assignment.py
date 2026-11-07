"""Tests for the assignment service."""

from datetime import date

from app.models.status import AssignmentStatus
from app.schemas.assignment import AssignmentCreate, AssignmentUpdate
from app.schemas.itinerary import ItineraryCreate
from app.schemas.user import AdminCreate, TouristCreate
from app.services import assignment as assignment_service
from app.services import itinerary as itinerary_service
from app.services import user as user_service


def _create_itinerary(db_session, owners):
    return itinerary_service.create_itinerary(
        db_session, ItineraryCreate(creation_date=date(2026, 1, 1), activity_count=2, **owners)
    )


def _create_tourist(db_session, email="ada@example.com"):
    return user_service.create_user(
        db_session,
        TouristCreate(name="Ada", role="tourist", email=email, password="x", age=30),
    )


def _create_admin(db_session, email="ana@example.com"):
    return user_service.create_user(
        db_session, AdminCreate(name="Ana", role="admin", email=email, password="x")
    )


def _assign(db_session, itinerary, tourist, admin, **fields):
    return assignment_service.create_assignment(
        db_session, itinerary.id, tourist.id, AssignmentCreate(admin_id=admin.id, **fields)
    )


def test_create_assignment_is_born_assigned_today(db_session, itinerary_owners):
    itinerary = _create_itinerary(db_session, itinerary_owners)
    tourist = _create_tourist(db_session)
    admin = _create_admin(db_session)

    assignment = _assign(db_session, itinerary, tourist, admin)

    assert assignment.itinerary_id == itinerary.id
    assert assignment.tourist_id == tourist.id
    assert assignment.admin_id == admin.id
    assert assignment.status is AssignmentStatus.ASSIGNED
    assert assignment.assignment_date == date.today()


def test_create_assignment_keeps_the_given_date(db_session, itinerary_owners):
    itinerary = _create_itinerary(db_session, itinerary_owners)
    tourist = _create_tourist(db_session)
    admin = _create_admin(db_session)

    assignment = _assign(db_session, itinerary, tourist, admin, assignment_date=date(2026, 5, 1))

    assert assignment.assignment_date == date(2026, 5, 1)


def test_list_assignments_only_returns_the_itinerary_ones(db_session, itinerary_owners):
    itinerary = _create_itinerary(db_session, itinerary_owners)
    other = _create_itinerary(db_session, itinerary_owners)
    ada = _create_tourist(db_session, "ada@example.com")
    bob = _create_tourist(db_session, "bob@example.com")
    admin = _create_admin(db_session)
    _assign(db_session, itinerary, ada, admin)
    _assign(db_session, itinerary, bob, admin)
    _assign(db_session, other, ada, admin)

    assignments = assignment_service.list_assignments(db_session, itinerary.id)

    assert {a.tourist_id for a in assignments} == {ada.id, bob.id}


def test_list_tourist_assignments_only_returns_the_tourist_ones(db_session, itinerary_owners):
    first = _create_itinerary(db_session, itinerary_owners)
    second = _create_itinerary(db_session, itinerary_owners)
    ada = _create_tourist(db_session, "ada@example.com")
    bob = _create_tourist(db_session, "bob@example.com")
    admin = _create_admin(db_session)
    _assign(db_session, first, ada, admin)
    _assign(db_session, second, ada, admin)
    _assign(db_session, first, bob, admin)

    assignments = assignment_service.list_tourist_assignments(db_session, ada.id)

    assert {a.itinerary_id for a in assignments} == {first.id, second.id}


def test_update_assignment_advances_the_status(db_session, itinerary_owners):
    itinerary = _create_itinerary(db_session, itinerary_owners)
    tourist = _create_tourist(db_session)
    admin = _create_admin(db_session)
    assignment = _assign(db_session, itinerary, tourist, admin)

    assignment_service.update_assignment(
        db_session, assignment, AssignmentUpdate(status=AssignmentStatus.IN_PROGRESS)
    )

    assignment = assignment_service.get_assignment(db_session, itinerary.id, tourist.id)
    assert assignment.status is AssignmentStatus.IN_PROGRESS
    assert assignment.assignment_date == date.today()


def test_get_assignment_returns_none_when_missing(db_session):
    assert assignment_service.get_assignment(db_session, 999, 999) is None


def test_delete_assignment_removes_it(db_session, itinerary_owners):
    itinerary = _create_itinerary(db_session, itinerary_owners)
    tourist = _create_tourist(db_session)
    admin = _create_admin(db_session)
    assignment = _assign(db_session, itinerary, tourist, admin)

    assignment_service.delete_assignment(db_session, assignment)

    assert assignment_service.get_assignment(db_session, itinerary.id, tourist.id) is None


def test_deleting_the_itinerary_removes_its_assignments(db_session, itinerary_owners):
    itinerary = _create_itinerary(db_session, itinerary_owners)
    tourist = _create_tourist(db_session)
    admin = _create_admin(db_session)
    _assign(db_session, itinerary, tourist, admin)

    itinerary_service.delete_itinerary(db_session, itinerary)

    assert assignment_service.list_tourist_assignments(db_session, tourist.id) == []


def test_deleting_the_tourist_removes_its_assignments(db_session, itinerary_owners):
    itinerary = _create_itinerary(db_session, itinerary_owners)
    tourist = _create_tourist(db_session)
    admin = _create_admin(db_session)
    _assign(db_session, itinerary, tourist, admin)

    user_service.delete_user(db_session, tourist)

    assert assignment_service.list_assignments(db_session, itinerary.id) == []
