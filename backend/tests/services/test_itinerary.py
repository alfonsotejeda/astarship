"""Tests for the itinerary service."""

from datetime import date

import pytest

from app.models.status import ItineraryStatus
from app.schemas.authorization import AuthorizationUpsert
from app.schemas.itinerary import ItineraryCreate, ItineraryUpdate
from app.schemas.user import GuideCreate
from app.services import authorization as authorization_service
from app.services import itinerary as itinerary_service
from app.services import package as package_service
from app.services import user as user_service


@pytest.fixture
def owners(itinerary_owners):
    return itinerary_owners


def test_create_itinerary_persists_it(db_session, owners):
    data = ItineraryCreate(creation_date=date(2026, 1, 1), activity_count=2, **owners)

    itinerary = itinerary_service.create_itinerary(db_session, data)

    assert itinerary.id is not None
    assert itinerary.creation_date == date(2026, 1, 1)
    assert itinerary.activity_count == 2
    assert itinerary.status is ItineraryStatus.PENDING
    assert itinerary.package_id == owners["package_id"]
    assert itinerary.guide_id == owners["guide_id"]


def test_get_itinerary_returns_none_when_missing(db_session):
    assert itinerary_service.get_itinerary(db_session, 999) is None


def test_update_itinerary_applies_partial_changes(db_session, owners):
    itinerary = itinerary_service.create_itinerary(
        db_session,
        ItineraryCreate(creation_date=date(2026, 1, 1), activity_count=2, **owners),
    )

    updated = itinerary_service.update_itinerary(
        db_session, itinerary, ItineraryUpdate(activity_count=3)
    )

    assert updated.activity_count == 3
    assert updated.creation_date == date(2026, 1, 1)
    assert updated.status is ItineraryStatus.PENDING


def test_delete_itinerary_removes_it(db_session, owners):
    itinerary = itinerary_service.create_itinerary(
        db_session,
        ItineraryCreate(creation_date=date(2026, 1, 1), activity_count=1, **owners),
    )

    itinerary_service.delete_itinerary(db_session, itinerary)

    assert itinerary_service.get_itinerary(db_session, itinerary.id) is None


def test_deleting_package_removes_its_itineraries(db_session, owners):
    itinerary = itinerary_service.create_itinerary(
        db_session,
        ItineraryCreate(creation_date=date(2026, 1, 1), activity_count=1, **owners),
    )
    package = package_service.get_package(db_session, owners["package_id"])

    package_service.delete_package(db_session, package)

    assert itinerary_service.get_itinerary(db_session, itinerary.id) is None


@pytest.fixture
def reviewer_id(db_session, owners):
    """Id of a guide that can validate the itineraries of the owners' package."""
    reviewer = user_service.create_user(
        db_session,
        GuideCreate(
            name="Ana", role="guide", email="ana@example.com", password="x", specialty="Nature"
        ),
    )
    authorization_service.create_authorization(
        db_session, owners["package_id"], reviewer.id, AuthorizationUpsert(can_validate=True)
    )
    return reviewer.id


def _create_with_status(db_session, owners, status, creation_date=date(2026, 1, 1)) -> int:
    itinerary = itinerary_service.create_itinerary(
        db_session,
        ItineraryCreate(creation_date=creation_date, activity_count=2, **owners),
    )
    itinerary.status = status
    db_session.commit()
    return itinerary.id


def test_list_pending_for_guide_returns_the_pending_ones_oldest_first(
    db_session, owners, reviewer_id
):
    newer = _create_with_status(db_session, owners, ItineraryStatus.PENDING, date(2026, 2, 1))
    older = _create_with_status(db_session, owners, ItineraryStatus.PENDING, date(2026, 1, 1))
    _create_with_status(db_session, owners, ItineraryStatus.VALIDATED)

    queue = itinerary_service.list_pending_for_guide(db_session, reviewer_id)

    assert [itinerary.id for itinerary in queue] == [older, newer]


def test_list_pending_for_guide_skips_their_own_itineraries(db_session, owners):
    authorization = authorization_service.get_authorization(
        db_session, owners["package_id"], owners["guide_id"]
    )
    authorization.can_validate = True
    db_session.commit()
    _create_with_status(db_session, owners, ItineraryStatus.PENDING)

    assert itinerary_service.list_pending_for_guide(db_session, owners["guide_id"]) == []


def test_list_pending_for_guide_needs_can_validate(db_session, owners, reviewer_id):
    authorization = authorization_service.get_authorization(
        db_session, owners["package_id"], reviewer_id
    )
    authorization.can_validate = False
    db_session.commit()
    _create_with_status(db_session, owners, ItineraryStatus.PENDING)

    assert itinerary_service.list_pending_for_guide(db_session, reviewer_id) == []


def test_list_validated_returns_the_validated_ones(db_session, owners):
    validated = _create_with_status(db_session, owners, ItineraryStatus.VALIDATED)
    for status in (ItineraryStatus.PENDING, ItineraryStatus.APPROVED, ItineraryStatus.REJECTED):
        _create_with_status(db_session, owners, status)

    queue = itinerary_service.list_validated(db_session)

    assert [itinerary.id for itinerary in queue] == [validated]
