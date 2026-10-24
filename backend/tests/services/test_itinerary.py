"""Tests for the itinerary service."""

from datetime import date

from app.models.status import ItineraryStatus
from app.schemas.itinerary import ItineraryCreate, ItineraryUpdate
from app.services import itinerary as itinerary_service


def test_create_itinerary_persists_it(db_session):
    data = ItineraryCreate(
        creation_date=date(2026, 1, 1), activity_count=2
    )

    itinerary = itinerary_service.create_itinerary(db_session, data)

    assert itinerary.id is not None
    assert itinerary.creation_date == date(2026, 1, 1)
    assert itinerary.activity_count == 2
    assert itinerary.status is ItineraryStatus.PENDING


def test_get_itinerary_returns_none_when_missing(db_session):
    assert itinerary_service.get_itinerary(db_session, 999) is None


def test_update_itinerary_applies_partial_changes(db_session):
    itinerary = itinerary_service.create_itinerary(
        db_session,
        ItineraryCreate(creation_date=date(2026, 1, 1), activity_count=2),
    )

    updated = itinerary_service.update_itinerary(
        db_session, itinerary, ItineraryUpdate(status=ItineraryStatus.VALIDATED)
    )

    assert updated.status is ItineraryStatus.VALIDATED
    assert updated.activity_count == 2


def test_delete_itinerary_removes_it(db_session):
    itinerary = itinerary_service.create_itinerary(
        db_session,
        ItineraryCreate(creation_date=date(2026, 1, 1), activity_count=1),
    )

    itinerary_service.delete_itinerary(db_session, itinerary)

    assert itinerary_service.get_itinerary(db_session, itinerary.id) is None
