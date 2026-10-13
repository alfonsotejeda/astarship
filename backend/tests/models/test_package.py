"""Tests for the Package model."""

from sqlalchemy import UniqueConstraint

from app.models.package import Package


def test_table_name():
    assert Package.__tablename__ == "packages"


def test_expected_columns():
    columns = {c.name for c in Package.__table__.columns}

    assert columns == {"id", "name", "destination", "validated"}


def test_name_and_destination_are_unique_together():
    uniques = {
        tuple(sorted(col.name for col in constraint.columns))
        for constraint in Package.__table__.constraints
        if isinstance(constraint, UniqueConstraint)
    }

    assert ("destination", "name") in uniques
