"""Tests for the Booking schemas."""

import pytest
from pydantic import ValidationError

from app.models.booking import Booking
from app.schemas.booking import BookingCreate, BookingRead


def test_create_requires_tourist_and_package_ids():
    with pytest.raises(ValidationError):
        BookingCreate(tourist_id=1)
    with pytest.raises(ValidationError):
        BookingCreate(package_id=1)
    with pytest.raises(ValidationError):
        BookingCreate()


def test_create_accepts_valid_pair():
    booking = BookingCreate(tourist_id=1, package_id=2)

    assert booking.tourist_id == 1
    assert booking.package_id == 2


def test_create_rejects_non_integer_ids():
    with pytest.raises(ValidationError):
        BookingCreate(tourist_id="abc", package_id=1)


def test_read_validates_from_orm_instance():
    booking = Booking(tourist_id=1, package_id=2)

    read = BookingRead.model_validate(booking)

    assert read.tourist_id == 1
    assert read.package_id == 2


def test_no_update_schema_exists():
    from app.schemas import booking

    assert not hasattr(booking, "BookingUpdate")
