"""Tests for the Booking schemas."""

from datetime import date

import pytest
from pydantic import ValidationError

from app.models.booking import Booking
from app.models.status import BookingStatus
from app.schemas.booking import BookingCreate, BookingRead, BookingUpdate


def test_create_requires_tourist_and_package_ids():
    with pytest.raises(ValidationError):
        BookingCreate(tourist_id=1)
    with pytest.raises(ValidationError):
        BookingCreate(package_id=1)
    with pytest.raises(ValidationError):
        BookingCreate()


def test_create_requires_booking_date():
    with pytest.raises(ValidationError):
        BookingCreate(tourist_id=1, package_id=2)


def test_create_accepts_valid_pair():
    booking = BookingCreate(tourist_id=1, package_id=2, booking_date=date(2026, 10, 1))

    assert booking.tourist_id == 1
    assert booking.package_id == 2
    assert booking.booking_date == date(2026, 10, 1)
    assert booking.status is BookingStatus.PENDING
    assert booking.proposed_date is None
    assert booking.itinerary_id is None
    assert booking.rejection_reason is None


def test_create_accepts_new_optional_fields():
    booking = BookingCreate(
        tourist_id=1,
        package_id=2,
        booking_date=date(2026, 10, 1),
        proposed_date=date(2026, 11, 1),
        itinerary_id=5,
        rejection_reason="No disponible",
        status=BookingStatus.REJECTED,
    )

    assert booking.proposed_date == date(2026, 11, 1)
    assert booking.itinerary_id == 5
    assert booking.rejection_reason == "No disponible"
    assert booking.status is BookingStatus.REJECTED


def test_create_rejects_non_integer_ids():
    with pytest.raises(ValidationError):
        BookingCreate(tourist_id="abc", package_id=1, booking_date=date(2026, 10, 1))


def test_read_validates_from_orm_instance():
    booking = Booking(
        tourist_id=1,
        package_id=2,
        booking_date=date(2026, 10, 1),
        status=BookingStatus.PENDING,
    )

    read = BookingRead.model_validate(booking)

    assert read.tourist_id == 1
    assert read.package_id == 2
    assert read.booking_date == date(2026, 10, 1)
    assert read.status is BookingStatus.PENDING


def test_update_schema_allows_partial_fields():
    update = BookingUpdate(status=BookingStatus.ASSIGNED)

    assert update.status is BookingStatus.ASSIGNED
    assert update.booking_date is None
    assert update.proposed_date is None
    assert update.itinerary_id is None
    assert update.rejection_reason is None


def test_update_schema_allows_all_fields():
    update = BookingUpdate(
        booking_date=date(2026, 10, 2),
        proposed_date=date(2026, 11, 5),
        itinerary_id=7,
        rejection_reason="Reprogramado",
        status=BookingStatus.CANCELLED,
    )

    assert update.booking_date == date(2026, 10, 2)
    assert update.proposed_date == date(2026, 11, 5)
    assert update.itinerary_id == 7
    assert update.rejection_reason == "Reprogramado"
    assert update.status is BookingStatus.CANCELLED


def test_update_schema_empty_is_valid():
    update = BookingUpdate()

    assert update.model_dump(exclude_unset=True) == {}
