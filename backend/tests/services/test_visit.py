"""Tests for the visit service used to record the data behind RC-4."""

import pytest
from pydantic import ValidationError

from app.models.status import VisitStatus
from app.schemas.visit import VisitCreated
from app.services import visit as visit_service


def test_get_visit_returns_the_recorded_visit(db_session, rc4_data):
    visit = visit_service.get_visit(
        db_session,
        rc4_data["itineraries"][0],
        rc4_data["tourists"]["Ada"],
        rc4_data["activities"]["Canyon"],
    )

    assert visit is not None
    assert (visit.status, visit.rating) == (VisitStatus.DONE, 5)


def test_create_visit_rejects_a_tourist_without_an_assignment(db_session, rc4_data):
    data = VisitCreated(
        itinerary_id=rc4_data["itineraries"][0],
        tourist_id=rc4_data["tourists"]["Cleo"],
        activity_id=rc4_data["activities"]["Canyon"],
        status=VisitStatus.DONE,
        rating=4,
    )

    with pytest.raises(LookupError):
        visit_service.create_visit(db_session, data)


def test_create_visit_rejects_an_existing_visit(db_session, rc4_data):
    data = VisitCreated(
        itinerary_id=rc4_data["itineraries"][0],
        tourist_id=rc4_data["tourists"]["Ada"],
        activity_id=rc4_data["activities"]["Canyon"],
        status=VisitStatus.DONE,
        rating=4,
    )

    with pytest.raises(ValueError):
        visit_service.create_visit(db_session, data)


def test_create_visit_requires_a_rating_when_done(db_session, rc4_data):
    with pytest.raises(ValidationError):
        VisitCreated(
            itinerary_id=rc4_data["itineraries"][0],
            tourist_id=rc4_data["tourists"]["Ada"],
            activity_id=rc4_data["activities"]["Museum"],
            status=VisitStatus.DONE,
        )


def test_list_visits_filters_by_itinerary_and_status(db_session, rc4_data):
    visits = visit_service.list_visits(
        db_session,
        itinerary_id=rc4_data["itineraries"][0],
        status=VisitStatus.SKIPPED,
    )

    assert [(visit.tourist_id, visit.activity_id) for visit in visits] == [
        (rc4_data["tourists"]["Ben"], rc4_data["activities"]["Museum"]),
        (rc4_data["tourists"]["Ben"], rc4_data["activities"]["Peak"]),
    ]
