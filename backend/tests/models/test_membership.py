"""Tests for the Membership model."""

from app.models.membership import Membership


def test_table_name():
    assert Membership.__tablename__ == "memberships"


def test_primary_key_is_tourist_and_travel_group():
    assert {c.name for c in Membership.__table__.primary_key} == {"tourist_id", "travel_group_id"}


def test_foreign_keys():
    targets = {fk.target_fullname for fk in Membership.__table__.foreign_keys}

    assert targets == {"tourists.id", "travel_groups.id"}
