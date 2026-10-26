"""Tests for the ProportionCategory model."""

from datetime import date

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.category import Category
from app.models.itinerary import Itinerary
from app.models.proportion_category import ProportionCategory


def test_table_name():
    assert ProportionCategory.__tablename__ == "proportion_categories"


def test_primary_key_is_itinerary_and_category():
    assert {c.name for c in ProportionCategory.__table__.primary_key} == {
        "itinerary_id",
        "category_id",
    }


def test_foreign_keys():
    targets = {fk.target_fullname for fk in ProportionCategory.__table__.foreign_keys}

    assert targets == {"itineraries.id", "categories.id"}


def test_value_is_not_nullable():
    assert not ProportionCategory.__table__.c.value.nullable


@pytest.mark.parametrize("value", [-1, 101])
def test_value_outside_range_is_rejected(db_session, value):
    itinerary = Itinerary(creation_date=date(2026, 1, 1), activity_count=1)
    category = Category(name="Culture")
    db_session.add_all([itinerary, category])
    db_session.flush()
    db_session.add(
        ProportionCategory(itinerary_id=itinerary.id, category_id=category.id, value=value)
    )

    with pytest.raises(IntegrityError):
        db_session.flush()
