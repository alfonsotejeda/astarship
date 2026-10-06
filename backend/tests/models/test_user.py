"""Tests for the User model."""

from app.models.user import User


def test_table_name():
    assert User.__tablename__ == "users"


def test_expected_columns():
    columns = {c.name for c in User.__table__.columns}

    assert columns == {"id", "name", "role", "email", "password_hash"}
