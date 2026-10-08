"""Tests for the user schemas."""

import pytest
from pydantic import ValidationError

from app.schemas.user import UserCreate, UserUpdate


def test_create_requires_all_fields():
    with pytest.raises(ValidationError):
        UserCreate(name="Ada")


def test_create_accepts_valid_data():
    user = UserCreate(name="Ada", role="tourist", email="ada@example.com", password="s3cret")

    assert user.email == "ada@example.com"


def test_update_allows_partial_data():
    update = UserUpdate(name="New name")

    assert update.name == "New name"
    assert update.role is None
