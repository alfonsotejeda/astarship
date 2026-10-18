"""Tests for the Booking service."""

import pytest

from app.schemas.booking import BookingCreate
from app.schemas.package import PackageCreate
from app.schemas.user import UserCreate
from app.services import booking as booking_service
from app.services import package as package_service
from app.services import user as user_service


def _create_user(db_session, email="ada@example.com"):
    return user_service.create_user(
        db_session,
        UserCreate(name="Ada", role="tourist", email=email, password="s3cret"),
    )


def _create_package(db_session, name="Europa Capitales", destination="París"):
    return package_service.create_package(
        db_session, PackageCreate(name=name, destination=destination)
    )


def test_create_booking_persists_pair(db_session):
    user = _create_user(db_session)
    package = _create_package(db_session)

    booking = booking_service.create_booking(
        db_session, BookingCreate(user_id=user.id, package_id=package.id)
    )

    assert booking.user_id == user.id
    assert booking.package_id == package.id
    found = booking_service.get_booking(db_session, user.id, package.id)
    assert found is not None
    assert found.user_id == user.id
    assert found.package_id == package.id


def test_get_booking_returns_none_when_missing(db_session):
    assert booking_service.get_booking(db_session, 1, 1) is None


def test_create_booking_with_missing_user_raises_value_error(db_session):
    package = _create_package(db_session)

    with pytest.raises(ValueError, match="User not found"):
        booking_service.create_booking(
            db_session, BookingCreate(user_id=999, package_id=package.id)
        )


def test_create_booking_with_missing_package_raises_value_error(db_session):
    user = _create_user(db_session)

    with pytest.raises(ValueError, match="Package not found"):
        booking_service.create_booking(
            db_session, BookingCreate(user_id=user.id, package_id=999)
        )


def test_create_booking_rejects_duplicate_pair(db_session):
    user = _create_user(db_session)
    package = _create_package(db_session)

    booking_service.create_booking(
        db_session, BookingCreate(user_id=user.id, package_id=package.id)
    )

    with pytest.raises(ValueError, match="already exists"):
        booking_service.create_booking(
            db_session, BookingCreate(user_id=user.id, package_id=package.id)
        )


def test_create_booking_allows_same_user_in_other_package(db_session):
    user = _create_user(db_session)
    package_a = _create_package(db_session, name="A", destination="Roma")
    package_b = _create_package(db_session, name="B", destination="Lisboa")

    booking_service.create_booking(
        db_session, BookingCreate(user_id=user.id, package_id=package_a.id)
    )
    booking = booking_service.create_booking(
        db_session, BookingCreate(user_id=user.id, package_id=package_b.id)
    )

    assert booking.package_id == package_b.id


def test_create_booking_allows_same_package_for_other_user(db_session):
    package = _create_package(db_session)
    user_a = _create_user(db_session, email="a@example.com")
    user_b = _create_user(db_session, email="b@example.com")

    booking_service.create_booking(
        db_session, BookingCreate(user_id=user_a.id, package_id=package.id)
    )
    booking = booking_service.create_booking(
        db_session, BookingCreate(user_id=user_b.id, package_id=package.id)
    )

    assert booking.user_id == user_b.id


def test_list_bookings_empty_returns_empty_list(db_session):
    assert booking_service.list_bookings(db_session) == []


def test_list_bookings_returns_every_booking(db_session):
    user = _create_user(db_session)
    package_a = _create_package(db_session, name="A", destination="Roma")
    package_b = _create_package(db_session, name="B", destination="Lisboa")

    booking_service.create_booking(
        db_session, BookingCreate(user_id=user.id, package_id=package_a.id)
    )
    booking_service.create_booking(
        db_session, BookingCreate(user_id=user.id, package_id=package_b.id)
    )

    bookings = booking_service.list_bookings(db_session)

    assert len(bookings) == 2


def test_delete_booking_removes_it(db_session):
    user = _create_user(db_session)
    package = _create_package(db_session)
    booking = booking_service.create_booking(
        db_session, BookingCreate(user_id=user.id, package_id=package.id)
    )

    booking_service.delete_booking(db_session, booking)

    assert booking_service.get_booking(db_session, user.id, package.id) is None


def test_booking_disappears_when_user_deleted(db_session):
    user = _create_user(db_session)
    package = _create_package(db_session)
    booking_service.create_booking(
        db_session, BookingCreate(user_id=user.id, package_id=package.id)
    )

    user_service.delete_user(db_session, user)

    assert booking_service.get_booking(db_session, user.id, package.id) is None


def test_booking_disappears_when_package_deleted(db_session):
    user = _create_user(db_session)
    package = _create_package(db_session)
    booking_service.create_booking(
        db_session, BookingCreate(user_id=user.id, package_id=package.id)
    )

    package_service.delete_package(db_session, package)

    assert booking_service.get_booking(db_session, user.id, package.id) is None
