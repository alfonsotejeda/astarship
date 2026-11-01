"""Tests for the Booking service."""

from datetime import date

import pytest

from app.schemas.booking import BookingCreate
from app.schemas.package import PackageCreate
from app.schemas.user import AdminCreate, TouristCreate
from app.services import booking as booking_service
from app.services import package as package_service
from app.services import user as user_service


def _create_tourist(db_session, email="ada@example.com"):
    return user_service.create_user(
        db_session,
        TouristCreate(name="Ada", role="tourist", email=email, password="x", age=30),
    )


def _create_package(db_session, name="Europa Capitales", destination="París"):
    return package_service.create_package(
        db_session, PackageCreate(name=name, destination=destination)
    )


def test_create_booking_persists_pair(db_session):
    tourist = _create_tourist(db_session)
    package = _create_package(db_session)

    booking = booking_service.create_booking(
        db_session,
        BookingCreate(booking_date=date(2026, 10, 1), tourist_id=tourist.id, package_id=package.id),
    )

    assert booking.tourist_id == tourist.id
    assert booking.package_id == package.id
    found = booking_service.get_booking(db_session, tourist.id, package.id)
    assert found is not None
    assert found.tourist_id == tourist.id
    assert found.package_id == package.id


def test_create_booking_links_the_related_models(db_session):
    tourist = _create_tourist(db_session)
    package = _create_package(db_session)

    booking = booking_service.create_booking(
        db_session,
        BookingCreate(booking_date=date(2026, 10, 1), tourist_id=tourist.id, package_id=package.id),
    )

    assert booking.tourist.user is tourist
    assert booking.package is package
    assert tourist.tourist.bookings == [booking]
    assert package.bookings == [booking]


def test_get_booking_returns_none_when_missing(db_session):
    assert booking_service.get_booking(db_session, 1, 1) is None


def test_create_booking_with_missing_tourist_raises_value_error(db_session):
    package = _create_package(db_session)

    with pytest.raises(ValueError, match="Tourist not found"):
        booking_service.create_booking(
            db_session,
            BookingCreate(booking_date=date(2026, 10, 1), tourist_id=999, package_id=package.id),
        )


def test_create_booking_with_missing_package_raises_value_error(db_session):
    tourist = _create_tourist(db_session)

    with pytest.raises(ValueError, match="Package not found"):
        booking_service.create_booking(
            db_session,
            BookingCreate(booking_date=date(2026, 10, 1), tourist_id=tourist.id, package_id=999),
        )


def test_create_booking_rejects_duplicate_pair(db_session):
    tourist = _create_tourist(db_session)
    package = _create_package(db_session)

    booking_service.create_booking(
        db_session,
        BookingCreate(booking_date=date(2026, 10, 1), tourist_id=tourist.id, package_id=package.id),
    )

    with pytest.raises(ValueError, match="already exists"):
        booking_service.create_booking(
            db_session,
            BookingCreate(
                booking_date=date(2026, 10, 1), tourist_id=tourist.id, package_id=package.id
            ),
        )


def test_create_booking_allows_same_tourist_in_other_package(db_session):
    tourist = _create_tourist(db_session)
    package_a = _create_package(db_session, name="A", destination="Roma")
    package_b = _create_package(db_session, name="B", destination="Lisboa")

    booking_service.create_booking(
        db_session,
        BookingCreate(
            booking_date=date(2026, 10, 1), tourist_id=tourist.id, package_id=package_a.id
        ),
    )
    booking = booking_service.create_booking(
        db_session,
        BookingCreate(
            booking_date=date(2026, 10, 1), tourist_id=tourist.id, package_id=package_b.id
        ),
    )

    assert booking.package_id == package_b.id


def test_create_booking_allows_same_package_for_other_tourist(db_session):
    package = _create_package(db_session)
    tourist_a = _create_tourist(db_session, email="a@example.com")
    tourist_b = _create_tourist(db_session, email="b@example.com")

    booking_service.create_booking(
        db_session,
        BookingCreate(
            booking_date=date(2026, 10, 1), tourist_id=tourist_a.id, package_id=package.id
        ),
    )
    booking = booking_service.create_booking(
        db_session,
        BookingCreate(
            booking_date=date(2026, 10, 1), tourist_id=tourist_b.id, package_id=package.id
        ),
    )

    assert booking.tourist_id == tourist_b.id


def test_create_booking_rejects_a_user_without_tourist_subtype(db_session):
    """A user that is not a tourist has no row in the tourists table."""
    admin = user_service.create_user(
        db_session,
        AdminCreate(name="Ana", role="admin", email="ana@example.com", password="x"),
    )
    package = _create_package(db_session)

    with pytest.raises(ValueError, match="Tourist not found"):
        booking_service.create_booking(
            db_session,
            BookingCreate(
                booking_date=date(2026, 10, 1), tourist_id=admin.id, package_id=package.id
            ),
        )


def test_list_bookings_empty_returns_empty_list(db_session):
    assert booking_service.list_bookings(db_session) == []


def test_list_bookings_returns_every_booking(db_session):
    tourist = _create_tourist(db_session)
    package_a = _create_package(db_session, name="A", destination="Roma")
    package_b = _create_package(db_session, name="B", destination="Lisboa")

    booking_service.create_booking(
        db_session,
        BookingCreate(
            booking_date=date(2026, 10, 1), tourist_id=tourist.id, package_id=package_a.id
        ),
    )
    booking_service.create_booking(
        db_session,
        BookingCreate(
            booking_date=date(2026, 10, 1), tourist_id=tourist.id, package_id=package_b.id
        ),
    )

    bookings = booking_service.list_bookings(db_session)

    assert len(bookings) == 2


def test_delete_booking_removes_it(db_session):
    tourist = _create_tourist(db_session)
    package = _create_package(db_session)
    booking = booking_service.create_booking(
        db_session,
        BookingCreate(booking_date=date(2026, 10, 1), tourist_id=tourist.id, package_id=package.id),
    )

    booking_service.delete_booking(db_session, booking)

    assert booking_service.get_booking(db_session, tourist.id, package.id) is None


def test_booking_disappears_when_tourist_deleted(db_session):
    tourist = _create_tourist(db_session)
    package = _create_package(db_session)
    booking_service.create_booking(
        db_session,
        BookingCreate(booking_date=date(2026, 10, 1), tourist_id=tourist.id, package_id=package.id),
    )

    user_service.delete_user(db_session, tourist)

    assert booking_service.get_booking(db_session, tourist.id, package.id) is None


def test_booking_disappears_when_package_deleted(db_session):
    tourist = _create_tourist(db_session)
    package = _create_package(db_session)
    booking_service.create_booking(
        db_session,
        BookingCreate(booking_date=date(2026, 10, 1), tourist_id=tourist.id, package_id=package.id),
    )

    package_service.delete_package(db_session, package)

    assert booking_service.get_booking(db_session, tourist.id, package.id) is None


def test_get_tourists_for_package_returns_booked_tourists(db_session):
    tourist_a = _create_tourist(db_session, email="a@example.com")
    tourist_b = _create_tourist(db_session, email="b@example.com")
    _create_tourist(db_session, email="c@example.com")  # no bookings
    package = _create_package(db_session)

    booking_service.create_booking(
        db_session,
        BookingCreate(
            booking_date=date(2026, 10, 1), tourist_id=tourist_a.id, package_id=package.id
        ),
    )
    booking_service.create_booking(
        db_session,
        BookingCreate(
            booking_date=date(2026, 10, 1), tourist_id=tourist_b.id, package_id=package.id
        ),
    )

    tourists = booking_service.get_tourists_for_package(db_session, package.id)

    assert {t.id for t in tourists} == {tourist_a.id, tourist_b.id}


def test_get_tourists_for_package_empty_when_no_bookings(db_session):
    package = _create_package(db_session)

    assert booking_service.get_tourists_for_package(db_session, package.id) == []


def test_get_packages_for_tourist_returns_booked_packages(db_session):
    tourist = _create_tourist(db_session)
    package_a = _create_package(db_session, name="A", destination="Roma")
    package_b = _create_package(db_session, name="B", destination="Lisboa")
    _create_package(db_session, name="C", destination="París")  # without a booking

    booking_service.create_booking(
        db_session,
        BookingCreate(
            booking_date=date(2026, 10, 1), tourist_id=tourist.id, package_id=package_a.id
        ),
    )
    booking_service.create_booking(
        db_session,
        BookingCreate(
            booking_date=date(2026, 10, 1), tourist_id=tourist.id, package_id=package_b.id
        ),
    )

    packages = booking_service.get_packages_for_tourist(db_session, tourist.id)

    assert {p.id for p in packages} == {package_a.id, package_b.id}


def test_get_packages_for_tourist_empty_when_no_bookings(db_session):
    tourist = _create_tourist(db_session)

    assert booking_service.get_packages_for_tourist(db_session, tourist.id) == []
