"""Tests for the Activity model."""

import pytest

from app.models.activity import Activity

FOREIGN_KEYS = {
    "activity_type_code": "activity_types.code",
    "category_id": "categories.id",
    "guide_id": "guides.id",
}


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
        "guide_id",
    }


@pytest.mark.parametrize("column, target", FOREIGN_KEYS.items())
def test_foreign_key_targets(column, target):
    (fk,) = Activity.__table__.c[column].foreign_keys

    assert fk.target_fullname == target


@pytest.mark.parametrize("column", FOREIGN_KEYS)
def test_foreign_keys_restrict_delete_and_cascade_update(column):
    (fk,) = Activity.__table__.c[column].foreign_keys

    assert fk.ondelete == "RESTRICT"
    assert fk.onupdate == "CASCADE"


@pytest.mark.parametrize("column", FOREIGN_KEYS)
def test_foreign_keys_are_required(column):
    assert Activity.__table__.c[column].nullable is False
