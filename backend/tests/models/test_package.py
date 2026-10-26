"""Tests for the Package model."""

from sqlalchemy import UniqueConstraint

from app.models.package import Package


def test_table_name():
    assert Package.__tablename__ == "packages"


def test_expected_columns():
    columns = {c.name for c in Package.__table__.columns}

    assert columns == {"id", "name", "destination", "status", "creation_date", "admin_id"}


def test_admin_id_references_admins():
    column = Package.__table__.c.admin_id
    (fk,) = column.foreign_keys

    assert fk.target_fullname == "admins.id"
    assert column.nullable is False


def test_name_and_destination_are_unique_together():
    uniques = {
        tuple(sorted(col.name for col in constraint.columns))
        for constraint in Package.__table__.constraints
        if isinstance(constraint, UniqueConstraint)
    }

    assert ("destination", "name") in uniques
