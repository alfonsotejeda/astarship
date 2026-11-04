"""Tests for the ItineraryComposition model."""

from datetime import date, time

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.activity import Activity
from app.models.activity_type import ActivityType
from app.models.category import Category
from app.models.itinerary import Itinerary
from app.models.itinerary_composition import ItineraryComposition
from app.models.user.guide import Guide
from app.models.user.user import User


def test_table_name():
    assert ItineraryComposition.__tablename__ == "itinerary_compositions"


def _make_activity(db_session) -> Activity:
    """Build an activity together with the rows its foreign keys point to."""
    category = Category(name="Adventure")
    activity_type = ActivityType(code="HIKE", name="Hiking")
    user = User(name="Gil", email="gil@example.com", password_hash="hash")
    db_session.add_all([category, activity_type, user])
    db_session.flush()
    guide = Guide(id=user.id, specialty="History")
    db_session.add(guide)
    db_session.flush()
    return Activity(
        name="Museum",
        effort_level=1,
        category_id=category.id,
        activity_type_code=activity_type.code,
        guide_id=guide.id,
    )


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
