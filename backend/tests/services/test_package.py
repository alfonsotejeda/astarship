"""Tests for the package service."""

import pytest

from app.schemas.package import PackageCreate, PackageUpdate
from app.services import package as package_service


def _create_package(db_session, name="Europa Capitales", destination="París"):
    """Create a helper package with sensible defaults."""
    return package_service.create_package(
        db_session, PackageCreate(name=name, destination=destination)
    )


def test_create_package_persists_with_validated_false(db_session):
    package = _create_package(db_session)

    assert package.id is not None
    assert package.name == "Europa Capitales"
    assert package.destination == "París"
    assert package.validated is False


def test_get_package_returns_none_when_missing(db_session):
    assert package_service.get_package(db_session, 999) is None


def test_create_package_rejects_duplicate_name_destination(db_session):
    _create_package(db_session)

    with pytest.raises(ValueError, match="already exists"):
        package_service.create_package(
            db_session, PackageCreate(name="Europa Capitales", destination="París")
        )


def test_create_package_allows_same_name_with_other_destination(db_session):
    _create_package(db_session)

    package = package_service.create_package(
        db_session, PackageCreate(name="Europa Capitales", destination="Roma")
    )

    assert package.destination == "Roma"


def test_update_package_applies_partial_changes(db_session):
    package = _create_package(db_session)

    updated = package_service.update_package(db_session, package, PackageUpdate(validated=True))

    assert updated.validated is True
    assert updated.name == "Europa Capitales"


def test_update_package_rejects_collision_with_other_package(db_session):
    _create_package(db_session, name="Otro", destination="Roma")
    package = _create_package(db_session)

    with pytest.raises(ValueError, match="already exists"):
        package_service.update_package(
            db_session, package, PackageUpdate(name="Otro", destination="Roma")
        )


def test_update_package_allows_keeping_its_own_values(db_session):
    package = _create_package(db_session)

    updated = package_service.update_package(
        db_session,
        package,
        PackageUpdate(name="Europa Capitales", destination="París"),
    )

    assert updated.name == "Europa Capitales"


def test_delete_package_removes_it(db_session):
    package = _create_package(db_session)

    package_service.delete_package(db_session, package)

    assert package_service.get_package(db_session, package.id) is None
