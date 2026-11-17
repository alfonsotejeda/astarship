"""Tests for the Attraction model."""

from app.models.attraction import Attraction


def test_table_name():
    assert Attraction.__tablename__ == "attractions"


def test_expected_columns():
    columns = {c.name for c in Attraction.__table__.columns}

    assert columns == {"id", "name", "address", "latitude", "longitude"}


def test_no_column_is_nullable():
    assert not any(c.nullable for c in Attraction.__table__.columns)


def test_activities_relationship_points_back_to_attraction():
    from app.models.activity import Activity

    assert Attraction.activities.property.mapper.class_ is Activity
    assert Attraction.activities.property.back_populates == "attraction"