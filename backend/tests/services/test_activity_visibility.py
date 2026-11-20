"""Tests for who can see which activities (RNF-10)."""

import pytest

from app.models.status import ReviewStatus
from app.schemas.user import GuideCreate, OperationsManagerCreate
from app.services import activity as activity_service
from app.services import attraction as attraction_service
from app.services import user as user_service


@pytest.fixture
def activities(db_session, insert_activity):
    """An approved activity and a pending one, both written by the same guide."""
    approved = insert_activity("Approved")
    approved.status = ReviewStatus.APPROVED
    pending = insert_activity("Pending")
    db_session.commit()
    return {"approved": approved, "pending": pending}


@pytest.fixture
def other_guide(db_session):
    """A guide who didn't write any of the activities."""
    return user_service.create_user(
        db_session,
        GuideCreate(
            name="Olga", role="guide", email="olga@example.com", password="x", specialty="Art"
        ),
    )


def _names(result):
    return sorted(activity.name for activity in result)


def test_admin_sees_every_activity(db_session, activities, admin_viewer):
    assert _names(activity_service.list_activities(db_session, admin_viewer)) == [
        "Approved",
        "Pending",
    ]


def test_author_sees_their_pending_activities(db_session, activities):
    author = activities["pending"].guide.user

    assert _names(activity_service.list_activities(db_session, author)) == [
        "Approved",
        "Pending",
    ]


def test_other_guide_sees_only_approved_activities(db_session, activities, other_guide):
    assert _names(activity_service.list_activities(db_session, other_guide)) == ["Approved"]


def test_other_roles_see_only_approved_activities(db_session, activities):
    manager = user_service.create_user(
        db_session,
        OperationsManagerCreate(
            name="Mara", role="operations_manager", email="mara@example.com", password="x"
        ),
    )

    assert _names(activity_service.list_activities(db_session, manager)) == ["Approved"]


def test_hidden_activity_is_not_found(db_session, activities, other_guide):
    pending_id = activities["pending"].id

    assert activity_service.get_visible_activity(db_session, pending_id, other_guide) is None


def test_attraction_counts_only_visible_activities(db_session, activities, other_guide):
    rows = attraction_service.activities_count_by_attractions(db_session, other_guide)

    assert [count for _, count in rows] == [1]


def test_attraction_with_only_hidden_activities_counts_zero(db_session, activities, other_guide):
    activities["approved"].status = ReviewStatus.PENDING
    db_session.commit()

    rows = attraction_service.activities_count_by_attractions(db_session, other_guide)

    assert [count for _, count in rows] == [0]
