"""Tests for the Itinerary model."""

from app.models.itinerary import Itinerary


def test_table_name():
    assert Itinerary.__tablename__ == "itineraries"


def test_expected_columns():
    columns = {c.name for c in Itinerary.__table__.columns}

    assert columns == {
        "id",
        "creation_date",
        "activity_count",
        "status",
        "package_id",
        "creator_id",
    }
