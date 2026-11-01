"""Tests for the Booking model."""

from app.models.booking import Booking
from app.models.package import Package
from app.models.user.tourist import Tourist


def test_table_name():
    assert Booking.__tablename__ == "bookings"


def test_expected_columns():
    columns = {c.name for c in Booking.__table__.columns}

    assert columns == {"tourist_id", "package_id", "booking_date"}


def test_composite_primary_key():
    pk_columns = {c.name for c in Booking.__table__.primary_key.columns}

    assert pk_columns == {"tourist_id", "package_id"}


def test_foreign_keys_cascade_on_parent_delete():
    foreign_keys = {(fk.target_fullname, fk.ondelete) for fk in Booking.__table__.foreign_keys}

    assert ("tourists.id", "CASCADE") in foreign_keys
    assert ("packages.id", "CASCADE") in foreign_keys


def test_tourist_relationship_points_at_the_tourist_model():
    assert Booking.tourist.property.mapper.class_ is Tourist
    assert Booking.tourist.property.back_populates == "bookings"
    assert Booking.tourist.property.uselist is False


def test_package_relationship_points_at_the_package_model():
    assert Booking.package.property.mapper.class_ is Package
    assert Booking.package.property.back_populates == "bookings"
    assert Booking.package.property.uselist is False


def test_tourist_and_package_expose_the_reverse_relationships():
    assert Tourist.bookings.property.back_populates == "tourist"
    assert Package.bookings.property.back_populates == "package"


def test_reverse_relationships_are_collections():
    assert Tourist.bookings.property.uselist is True
    assert Package.bookings.property.uselist is True


def test_booking_can_be_built_from_its_relationships():
    tourist = Tourist(id=1, age=30)
    package = Package(id=2, name="Europa", destination="París")

    booking = Booking(tourist=tourist, package=package)

    assert booking.tourist is tourist
    assert booking.package is package
    assert tourist.bookings == [booking]
    assert package.bookings == [booking]
