"""Tests for the Activity model."""

from app.models.activity import Activity


def test_table_name():
    assert Activity.__tablename__ == "activities"


def test_expected_columns():
    columns = {c.name for c in Activity.__table__.columns}

    assert columns == {
        "id",
        "name",
        "effort_level",
        "duration",
        "status",
        "creation_date",
        "activity_type_code",
        "category_id",
        "user_id",
    }
