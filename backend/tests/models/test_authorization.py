"""Tests for the Authorization model."""

from app.models.authorization import Authorization


def test_table_name():
    assert Authorization.__tablename__ == "authorizations"


def test_primary_key_is_guide_and_package():
    assert {c.name for c in Authorization.__table__.primary_key} == {"guide_id", "package_id"}


def test_foreign_keys():
    targets = {fk.target_fullname for fk in Authorization.__table__.foreign_keys}

    assert targets == {"guides.id", "packages.id"}


def test_permission_flags_are_not_nullable():
    columns = Authorization.__table__.c

    assert not columns.can_generate.nullable
    assert not columns.can_validate.nullable
