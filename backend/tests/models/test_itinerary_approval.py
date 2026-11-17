"""Tests for the ItineraryApproval model."""

from datetime import UTC, date, datetime

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.models.itinerary import Itinerary
from app.models.itinerary_approval import ItineraryApproval
from app.models.status import ApprovalResult
from app.models.user.operations_manager import OperationsManager
from app.models.user.user import User


@pytest.fixture
def base(db_session, itinerary_owners):
    user = User(name="Manager", email="manager@test.com", password_hash="hash")
    db_session.add(user)
    db_session.flush()
    manager = OperationsManager(id=user.id)
    itinerary = Itinerary(creation_date=date(2026, 10, 1), activity_count=3, **itinerary_owners)
    db_session.add_all([manager, itinerary])
    db_session.commit()
    return {"manager": manager, "itinerary": itinerary}


def _approval(base, **fields) -> ItineraryApproval:
    return ItineraryApproval(
        itinerary_id=base["itinerary"].id, manager_id=base["manager"].id, **fields
    )


def _count_approvals(db_session) -> int:
    return db_session.scalar(select(func.count()).select_from(ItineraryApproval))


def test_create_approval_sets_defaults(db_session, base):
    approval = _approval(base, result=ApprovalResult.APPROVED)
    db_session.add(approval)
    db_session.commit()
    db_session.refresh(approval)

    assert approval.approval_date is not None
    assert approval.result is ApprovalResult.APPROVED
    assert approval.observations is None


def test_same_manager_can_decide_again_on_another_date(db_session, base):
    db_session.add_all(
        [
            _approval(
                base,
                approval_date=datetime(2026, 10, 1, tzinfo=UTC),
                result=ApprovalResult.REJECTED,
                observations="Build another one",
            ),
            _approval(
                base,
                approval_date=datetime(2026, 10, 2, tzinfo=UTC),
                result=ApprovalResult.APPROVED,
            ),
        ]
    )
    db_session.commit()

    assert _count_approvals(db_session) == 2


def test_duplicate_primary_key_is_rejected(db_session, base):
    when = datetime(2026, 10, 1, tzinfo=UTC)
    db_session.add(_approval(base, approval_date=when, result=ApprovalResult.APPROVED))
    db_session.commit()

    db_session.add(_approval(base, approval_date=when, result=ApprovalResult.APPROVED))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_rejection_without_observations_is_rejected(db_session, base):
    db_session.add(_approval(base, result=ApprovalResult.REJECTED))

    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_deleting_the_itinerary_removes_its_approvals(db_session, base):
    db_session.add(_approval(base, result=ApprovalResult.APPROVED))
    db_session.commit()

    db_session.delete(base["itinerary"])
    db_session.commit()

    assert _count_approvals(db_session) == 0
