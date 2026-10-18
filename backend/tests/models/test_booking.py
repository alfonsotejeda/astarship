"""Tests for the Booking model."""

from app.models.booking import Booking


def test_table_name():
    assert Booking.__tablename__ == "bookings"


def test_expected_columns():
    columns = {c.name for c in Booking.__table__.columns}

    assert columns == {"user_id", "package_id"}


def test_composite_primary_key():
    pk_columns = {c.name for c in Booking.__table__.primary_key.columns}

    assert pk_columns == {"user_id", "package_id"}


def test_foreign_keys_cascade_on_parent_delete():
    foreign_keys = {
        (fk.target_fullname, fk.ondelete) for fk in Booking.__table__.foreign_keys
    }

    assert ("users.id", "CASCADE") in foreign_keys
    assert ("packages.id", "CASCADE") in foreign_keys
