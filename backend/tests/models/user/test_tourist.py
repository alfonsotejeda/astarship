"""Tests for the Tourist model."""

from app.models.user.tourist import Tourist


def test_table_name():
    assert Tourist.__tablename__ == "tourists"


def test_expected_columns():
    assert {c.name for c in Tourist.__table__.columns} == {"id", "age"}


def test_id_references_users():
    (fk,) = Tourist.__table__.c.id.foreign_keys

    assert fk.target_fullname == "users.id"
