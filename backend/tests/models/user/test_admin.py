"""Tests for the Admin model."""

from app.models.user.admin import Admin


def test_table_name():
    assert Admin.__tablename__ == "admins"


def test_expected_columns():
    assert {c.name for c in Admin.__table__.columns} == {"id"}


def test_id_references_users():
    (fk,) = Admin.__table__.c.id.foreign_keys

    assert fk.target_fullname == "users.id"
