"""Tests for the itinerary service."""

from datetime import date

import pytest

from app.models.status import ItineraryStatus
from app.schemas.itinerary import ItineraryCreate, ItineraryUpdate
from app.schemas.package import PackageCreate
from app.schemas.user import GuideCreate
from app.services import itinerary as itinerary_service
from app.services import package as package_service
from app.services import user as user_service


@pytest.fixture
def owners(db_session):
    package = package_service.create_package(
        db_session, PackageCreate(name="Andes", destination="Peru")
    )
    guide = user_service.create_user(
        db_session,
        GuideCreate(
            name="Gil", role="guide", email="gil@example.com", password="x", specialty="History"
        ),
    )
    return {"package_id": package.id, "guide_id": guide.id}


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
        db_session, itinerary, ItineraryUpdate(status=ItineraryStatus.VALIDATED)
    )

    assert updated.status is ItineraryStatus.VALIDATED
    assert updated.activity_count == 2


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
