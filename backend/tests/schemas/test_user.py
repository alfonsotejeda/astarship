"""Tests for the user schemas."""

import pytest
from pydantic import TypeAdapter, ValidationError

from app.schemas.user import GuideCreate, TouristCreate, UserCreate, UserUpdate

user_create = TypeAdapter(UserCreate)


def test_create_requires_all_fields():
    with pytest.raises(ValidationError):
        user_create.validate_python({"name": "Ada"})


def test_create_picks_the_schema_of_the_role():
    user = user_create.validate_python(
        {
            "name": "Ada",
            "role": "guide",
            "email": "ada@example.com",
            "password": "x",
            "specialty": "History",
        }
    )

    assert isinstance(user, GuideCreate)
    assert user.specialty == "History"


def test_create_rejects_unknown_role():
    with pytest.raises(ValidationError):
        user_create.validate_python(
            {"name": "Ada", "role": "pilot", "email": "ada@example.com", "password": "x"}
        )


def test_create_requires_the_role_fields():
    with pytest.raises(ValidationError):
        TouristCreate(name="Ada", role="tourist", email="ada@example.com", password="x")


def test_create_tourist_rejects_travel_group():
    with pytest.raises(ValidationError):
        TouristCreate(
            name="Ada",
            role="tourist",
            email="ada@example.com",
            password="x",
            age=30,
            travel_group_id=1,
        )


def test_create_rejects_fields_of_other_roles():
    with pytest.raises(ValidationError):
        user_create.validate_python(
            {
                "name": "Ada",
                "role": "admin",
                "email": "ada@example.com",
                "password": "x",
                "specialty": "History",
            }
        )


def test_update_allows_partial_data():
    update = UserUpdate(name="New name")

    assert update.name == "New name"
    assert update.guide is None
