"""Tests for the TravelGroup model."""

from app.models.travel_group import TravelGroup


def test_table_name():
    assert TravelGroup.__tablename__ == "travel_groups"


def test_expected_columns():
    columns = {c.name for c in TravelGroup.__table__.columns}

    assert columns == {"id", "name"}
