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
        "guide_id",
    }


def test_foreign_keys():
    targets = {fk.target_fullname for fk in Itinerary.__table__.foreign_keys}

    assert targets == {"packages.id", "guides.id"}


def test_package_and_guide_are_not_nullable():
    columns = Itinerary.__table__.c

    assert not columns.package_id.nullable
    assert not columns.guide_id.nullable
