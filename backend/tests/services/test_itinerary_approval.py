"""Tests for the itinerary approval service."""

from datetime import UTC, date, datetime

from app.models.itinerary_approval import ItineraryApproval
from app.models.status import ApprovalResult, ItineraryStatus
from app.schemas.itinerary import ItineraryCreate
from app.schemas.itinerary_approval import ItineraryApprovalCreate
from app.schemas.user import OperationsManagerCreate
from app.services import itinerary as itinerary_service
from app.services import itinerary_approval as approval_service
from app.services import user as user_service


def _create_itinerary(db_session, owners):
    itinerary = itinerary_service.create_itinerary(
        db_session, ItineraryCreate(creation_date=date(2026, 1, 1), activity_count=2, **owners)
    )
    itinerary.status = ItineraryStatus.VALIDATED
    db_session.commit()
    return itinerary


def _create_manager(db_session, email="olga@example.com"):
    return user_service.create_user(
        db_session,
        OperationsManagerCreate(name="Olga", role="operations_manager", email=email, password="x"),
    )


def test_create_approval_approves_the_itinerary(db_session, itinerary_owners):
    itinerary = _create_itinerary(db_session, itinerary_owners)
    manager = _create_manager(db_session)

    approval = approval_service.create_approval(
        db_session, itinerary, ItineraryApprovalCreate(manager_id=manager.id, result="approved")
    )

    assert approval.itinerary_id == itinerary.id
    assert approval.manager_id == manager.id
    assert approval.result is ApprovalResult.APPROVED
    assert approval.observations is None
    assert approval.approval_date is not None
    assert itinerary.status is ItineraryStatus.APPROVED


def test_create_approval_rejects_the_itinerary(db_session, itinerary_owners):
    itinerary = _create_itinerary(db_session, itinerary_owners)
    manager = _create_manager(db_session)

    approval = approval_service.create_approval(
        db_session,
        itinerary,
        ItineraryApprovalCreate(manager_id=manager.id, result="rejected", observations="Redo it"),
    )

    assert approval.result is ApprovalResult.REJECTED
    assert approval.observations == "Redo it"
    assert itinerary.status is ItineraryStatus.REJECTED


def test_list_approvals_oldest_first(db_session, itinerary_owners):
    itinerary = _create_itinerary(db_session, itinerary_owners)
    other = _create_itinerary(db_session, itinerary_owners)
    manager = _create_manager(db_session)
    db_session.add_all(
        [
            ItineraryApproval(
                itinerary_id=itinerary.id,
                manager_id=manager.id,
                approval_date=datetime(2026, 10, day, tzinfo=UTC),
                result=ApprovalResult.APPROVED,
            )
            for day in (2, 1)
        ]
        + [
            ItineraryApproval(
                itinerary_id=other.id, manager_id=manager.id, result=ApprovalResult.APPROVED
            )
        ]
    )
    db_session.commit()

    approvals = approval_service.list_approvals(db_session, itinerary.id)

    assert [a.approval_date.day for a in approvals] == [1, 2]


def test_list_approvals_empty(db_session, itinerary_owners):
    itinerary = _create_itinerary(db_session, itinerary_owners)

    assert approval_service.list_approvals(db_session, itinerary.id) == []
