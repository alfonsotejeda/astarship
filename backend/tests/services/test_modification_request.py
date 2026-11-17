"""Tests for the modification request service."""

from datetime import date, datetime

from app.models.status import ModificationRequestStatus
from app.schemas.assignment import AssignmentCreate
from app.schemas.itinerary import ItineraryCreate
from app.schemas.modification_request import ModificationRequestCreate, ModificationRequestUpdate
from app.schemas.travel_group import TravelGroupCreate
from app.schemas.user import AdminCreate, GuideCreate, TouristCreate
from app.services import assignment as assignment_service
from app.services import itinerary as itinerary_service
from app.services import membership as membership_service
from app.services import modification_request as modification_request_service
from app.services import travel_group as travel_group_service
from app.services import user as user_service


def _create_assignment(db_session, itinerary_owners, tourist_email="ada@example.com"):
    itinerary = itinerary_service.create_itinerary(
        db_session,
        ItineraryCreate(creation_date=date(2026, 1, 1), activity_count=2, **itinerary_owners),
    )
    tourist = user_service.create_user(
        db_session,
        TouristCreate(name="Ada", role="tourist", email=tourist_email, password="x", age=30),
    )
    admin = user_service.create_user(
        db_session,
        AdminCreate(name="Ana", role="admin", email=f"admin.{tourist_email}", password="x"),
    )
    return assignment_service.create_assignment(
        db_session, itinerary.id, tourist.id, AssignmentCreate(admin_id=admin.id)
    )


def _create_guide(db_session, email="gus@example.com"):
    return user_service.create_user(
        db_session,
        GuideCreate(name="Gus", role="guide", email=email, password="x", specialty="history"),
    )


def _add_to_group(db_session, tourist_id, guide):
    travel_group = travel_group_service.create_travel_group(
        db_session, TravelGroupCreate(name="Group", guide_id=guide.id)
    )
    membership_service.create_membership(db_session, travel_group.id, tourist_id)


def _request(db_session, assignment, guide, **fields):
    return modification_request_service.create_modification_request(
        db_session,
        assignment.itinerary_id,
        assignment.tourist_id,
        guide.id,
        ModificationRequestCreate(description=fields.pop("description", "Swap it"), **fields),
    )


def test_create_modification_request_is_born_requested_now(db_session, itinerary_owners):
    assignment = _create_assignment(db_session, itinerary_owners)
    guide = _create_guide(db_session)
    before = datetime.now()

    modification_request = _request(db_session, assignment, guide, description="Swap the museum")

    assert modification_request.itinerary_id == assignment.itinerary_id
    assert modification_request.tourist_id == assignment.tourist_id
    assert modification_request.guide_id == guide.id
    assert modification_request.description == "Swap the museum"
    assert modification_request.status is ModificationRequestStatus.REQUESTED
    assert modification_request.result is None
    assert before <= modification_request.request_date <= datetime.now()


def test_create_modification_request_keeps_the_given_date(db_session, itinerary_owners):
    assignment = _create_assignment(db_session, itinerary_owners)
    guide = _create_guide(db_session)

    modification_request = _request(
        db_session, assignment, guide, request_date=datetime(2026, 5, 1, 10, 30)
    )

    assert modification_request.request_date == datetime(2026, 5, 1, 10, 30)


def test_get_modification_request_by_its_key(db_session, itinerary_owners):
    assignment = _create_assignment(db_session, itinerary_owners)
    guide = _create_guide(db_session)
    _request(db_session, assignment, guide, request_date=datetime(2026, 5, 1, 10, 30))

    modification_request = modification_request_service.get_modification_request(
        db_session,
        assignment.itinerary_id,
        assignment.tourist_id,
        guide.id,
        datetime(2026, 5, 1, 10, 30),
    )

    assert modification_request is not None


def test_get_modification_request_returns_none_when_missing(db_session, itinerary_owners):
    assert (
        modification_request_service.get_modification_request(
            db_session, 999, 999, 999, datetime(2026, 5, 1)
        )
        is None
    )


def test_list_modification_requests_only_returns_the_assignment_ones(db_session, itinerary_owners):
    assignment = _create_assignment(db_session, itinerary_owners, "ada@example.com")
    other = _create_assignment(db_session, itinerary_owners, "bob@example.com")
    guide = _create_guide(db_session)
    _request(db_session, assignment, guide, request_date=datetime(2026, 5, 1))
    _request(db_session, assignment, guide, request_date=datetime(2026, 5, 2))
    _request(db_session, other, guide, request_date=datetime(2026, 5, 1))

    modification_requests = modification_request_service.list_modification_requests(
        db_session, assignment.itinerary_id, assignment.tourist_id
    )

    assert {r.request_date for r in modification_requests} == {
        datetime(2026, 5, 1),
        datetime(2026, 5, 2),
    }


def test_list_guide_modification_requests_only_returns_the_guide_ones(db_session, itinerary_owners):
    assignment = _create_assignment(db_session, itinerary_owners)
    gus = _create_guide(db_session, "gus@example.com")
    eva = _create_guide(db_session, "eva@example.com")
    _request(db_session, assignment, gus, request_date=datetime(2026, 5, 1))
    _request(db_session, assignment, eva, request_date=datetime(2026, 5, 2))

    modification_requests = modification_request_service.list_guide_modification_requests(
        db_session, gus.id
    )

    assert [r.request_date for r in modification_requests] == [datetime(2026, 5, 1)]


def test_default_guide_is_the_travel_group_one(db_session, itinerary_owners):
    assignment = _create_assignment(db_session, itinerary_owners)
    guide = _create_guide(db_session)
    _add_to_group(db_session, assignment.tourist_id, guide)
    _add_to_group(db_session, assignment.tourist_id, guide)

    assert modification_request_service.default_guide_id(db_session, assignment.tourist_id) == (
        guide.id
    )


def test_default_guide_is_none_without_travel_group(db_session, itinerary_owners):
    assignment = _create_assignment(db_session, itinerary_owners)

    assert modification_request_service.default_guide_id(db_session, assignment.tourist_id) is None


def test_default_guide_is_none_when_groups_have_different_guides(db_session, itinerary_owners):
    assignment = _create_assignment(db_session, itinerary_owners)
    _add_to_group(db_session, assignment.tourist_id, _create_guide(db_session, "gus@example.com"))
    _add_to_group(db_session, assignment.tourist_id, _create_guide(db_session, "eva@example.com"))

    assert modification_request_service.default_guide_id(db_session, assignment.tourist_id) is None


def test_update_modification_request_resolves_it(db_session, itinerary_owners):
    assignment = _create_assignment(db_session, itinerary_owners)
    guide = _create_guide(db_session)
    modification_request = _request(db_session, assignment, guide)

    modification_request_service.update_modification_request(
        db_session,
        modification_request,
        ModificationRequestUpdate(status=ModificationRequestStatus.RESOLVED, result="Swapped"),
    )

    assert modification_request.status is ModificationRequestStatus.RESOLVED
    assert modification_request.result == "Swapped"
    assert modification_request.description == "Swap it"


def test_delete_modification_request_removes_it(db_session, itinerary_owners):
    assignment = _create_assignment(db_session, itinerary_owners)
    guide = _create_guide(db_session)
    modification_request = _request(db_session, assignment, guide)

    modification_request_service.delete_modification_request(db_session, modification_request)

    assert (
        modification_request_service.list_modification_requests(
            db_session, assignment.itinerary_id, assignment.tourist_id
        )
        == []
    )


def test_deleting_the_assignment_removes_its_modification_requests(db_session, itinerary_owners):
    assignment = _create_assignment(db_session, itinerary_owners)
    guide = _create_guide(db_session)
    _request(db_session, assignment, guide)

    assignment_service.delete_assignment(db_session, assignment)

    assert modification_request_service.list_guide_modification_requests(db_session, guide.id) == []


def test_deleting_the_guide_removes_its_modification_requests(db_session, itinerary_owners):
    assignment = _create_assignment(db_session, itinerary_owners)
    guide = _create_guide(db_session)
    _request(db_session, assignment, guide)

    user_service.delete_user(db_session, guide)

    assert (
        modification_request_service.list_modification_requests(
            db_session, assignment.itinerary_id, assignment.tourist_id
        )
        == []
    )
