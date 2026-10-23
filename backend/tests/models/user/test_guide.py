"""Tests for the Guide model."""

from app.models.user.guide import Guide


def test_table_name():
    assert Guide.__tablename__ == "guides"


def test_expected_columns():
    assert {c.name for c in Guide.__table__.columns} == {"id", "specialty"}


def test_id_references_users():
    (fk,) = Guide.__table__.c.id.foreign_keys

    assert fk.target_fullname == "users.id"
