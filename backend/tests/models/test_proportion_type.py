"""Tests for the ProportionType model."""

from datetime import date

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.activity_type import ActivityType
from app.models.itinerary import Itinerary
from app.models.proportion_type import ProportionType


def test_table_name():
    assert ProportionType.__tablename__ == "proportion_types"


def test_primary_key_is_itinerary_and_activity_type():
    assert {c.name for c in ProportionType.__table__.primary_key} == {
        "itinerary_id",
        "activity_type_code",
    }


def test_foreign_keys():
    targets = {fk.target_fullname for fk in ProportionType.__table__.foreign_keys}

    assert targets == {"itineraries.id", "activity_types.code"}


def test_value_is_not_nullable():
    assert not ProportionType.__table__.c.value.nullable


@pytest.mark.parametrize("value", [-1, 101])
def test_value_outside_range_is_rejected(db_session, value):
    itinerary = Itinerary(creation_date=date(2026, 1, 1), activity_count=1)
    db_session.add_all([itinerary, ActivityType(code="visit", name="Visit")])
    db_session.flush()
    db_session.add(
        ProportionType(itinerary_id=itinerary.id, activity_type_code="visit", value=value)
    )

    with pytest.raises(IntegrityError):
        db_session.flush()
