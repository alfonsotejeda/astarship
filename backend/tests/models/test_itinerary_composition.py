"""Tests for the ItineraryComposition model."""

from datetime import date, time

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.activity import Activity
from app.models.itinerary import Itinerary
from app.models.itinerary_composition import ItineraryComposition


def test_table_name():
    assert ItineraryComposition.__tablename__ == "itinerary_compositions"


def test_primary_key_is_itinerary_and_activity():
    assert {c.name for c in ItineraryComposition.__table__.primary_key} == {
        "itinerary_id",
        "activity_id",
    }


def test_foreign_keys():
    targets = {fk.target_fullname for fk in ItineraryComposition.__table__.foreign_keys}

    assert targets == {"itineraries.id", "activities.id"}


@pytest.mark.parametrize("column", ["order", "day", "start_time"])
def test_attributes_are_not_nullable(column):
    assert not ItineraryComposition.__table__.c[column].nullable


@pytest.mark.parametrize("field", ["order", "day"])
def test_non_positive_values_are_rejected(db_session, field, itinerary_owners):
    itinerary = Itinerary(creation_date=date(2026, 1, 1), activity_count=1, **itinerary_owners)
    activity = Activity(name="Museum", effort_level=1, duration=60)
    db_session.add_all([itinerary, activity])
    db_session.flush()
    values = {"order": 1, "day": 1, field: 0}
    db_session.add(
        ItineraryComposition(
            itinerary_id=itinerary.id, activity_id=activity.id, start_time=time(9), **values
        )
    )

    with pytest.raises(IntegrityError):
        db_session.flush()
