"""Tests for the TravelGroup model."""

from app.models.travel_group import TravelGroup


def test_table_name():
    assert TravelGroup.__tablename__ == "travel_groups"


def test_expected_columns():
    columns = {c.name for c in TravelGroup.__table__.columns}

    assert columns == {"id", "name", "guide_id"}


def test_guide_foreign_key():
    (fk,) = TravelGroup.__table__.c.guide_id.foreign_keys

    assert fk.target_fullname == "guides.id"
    assert fk.ondelete == "RESTRICT"
