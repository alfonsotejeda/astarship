"""Tests for the ActivityType model."""

from app.models.activity_type import ActivityType


def test_table_name():
    assert ActivityType.__tablename__ == "activity_types"


def test_expected_columns():
    columns = {c.name for c in ActivityType.__table__.columns}

    assert columns == {"code", "name"}
