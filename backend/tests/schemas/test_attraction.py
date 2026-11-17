"""Tests for the attraction schemas."""

import pytest
from pydantic import ValidationError

from app.schemas.attraction import AttractionCreate, AttractionUpdate

VALID = {"name": "Malecón", "address": "Av. del Puerto", "latitude": 23.14, "longitude": -82.36}


def test_create_accepts_valid_data():
    attraction = AttractionCreate(**VALID)

    assert attraction.name == "Malecón"
    assert attraction.latitude == 23.14
    assert attraction.longitude == -82.36


def test_create_requires_all_fields():
    with pytest.raises(ValidationError):
        AttractionCreate(name="Malecón", address="Av. del Puerto", latitude=23.14)


@pytest.mark.parametrize("latitude", [-90.1, 90.1])
def test_create_rejects_latitude_out_of_range(latitude):
    with pytest.raises(ValidationError):
        AttractionCreate(**{**VALID, "latitude": latitude})


@pytest.mark.parametrize("longitude", [-180.1, 180.1])
def test_create_rejects_longitude_out_of_range(longitude):
    with pytest.raises(ValidationError):
        AttractionCreate(**{**VALID, "longitude": longitude})


def test_create_accepts_limit_coordinates():
    attraction = AttractionCreate(**{**VALID, "latitude": -90, "longitude": 180})

    assert attraction.latitude == -90
    assert attraction.longitude == 180


def test_create_rejects_empty_name():
    with pytest.raises(ValidationError):
        AttractionCreate(**{**VALID, "name": ""})


def test_update_allows_partial_data():
    update = AttractionUpdate(name="New name")

    assert update.model_dump(exclude_unset=True) == {"name": "New name"}


def test_update_rejects_explicit_null():
    with pytest.raises(ValidationError):
        AttractionUpdate(name=None)


def test_update_rejects_latitude_out_of_range():
    with pytest.raises(ValidationError):
        AttractionUpdate(latitude=91)
