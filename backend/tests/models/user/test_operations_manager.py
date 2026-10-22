"""Tests for the OperationsManager model."""

from app.models.user.operations_manager import OperationsManager


def test_table_name():
    assert OperationsManager.__tablename__ == "operations_managers"


def test_expected_columns():
    assert {c.name for c in OperationsManager.__table__.columns} == {"id"}


def test_id_references_users():
    (fk,) = OperationsManager.__table__.c.id.foreign_keys

    assert fk.target_fullname == "users.id"
