"""Tests for the package service."""

import pytest

from app.models.status import ReviewStatus
from app.schemas.category import CategoryCreate
from app.schemas.package import PackageCategoriesUpdate, PackageCreate, PackageUpdate
from app.schemas.user import AdminCreate
from app.services import category as category_service
from app.services import package as package_service
from app.services import user as user_service


@pytest.fixture
def admin_id(db_session):
    """Id of an admin that generates the packages of a test."""
    return user_service.create_user(
        db_session, AdminCreate(name="Ada", role="admin", email="ada@example.com", password="x")
    ).id


def _create_package(db_session, admin_id, name="Europa Capitales", destination="París"):
    """Create a helper package with sensible defaults."""
    return package_service.create_package(
        db_session, PackageCreate(name=name, destination=destination, admin_id=admin_id)
    )


def test_create_package_persists_as_pending(db_session, admin_id):
    package = _create_package(db_session, admin_id)

    assert package.id is not None
    assert package.name == "Europa Capitales"
    assert package.destination == "París"
    assert package.status is ReviewStatus.PENDING
    assert package.creation_date is not None
    assert package.admin_id == admin_id
    assert package.admin.packages == [package]


def test_get_package_returns_none_when_missing(db_session):
    assert package_service.get_package(db_session, 999) is None


def test_create_package_rejects_duplicate_name_destination(db_session, admin_id):
    _create_package(db_session, admin_id)

    with pytest.raises(ValueError, match="already exists"):
        package_service.create_package(
            db_session, PackageCreate(name="Europa Capitales", destination="París", admin_id=admin_id)
        )


def test_create_package_allows_same_name_with_other_destination(db_session, admin_id):
    _create_package(db_session, admin_id)

    package = package_service.create_package(
        db_session, PackageCreate(name="Europa Capitales", destination="Roma", admin_id=admin_id)
    )

    assert package.destination == "Roma"


def test_update_package_applies_partial_changes(db_session, admin_id):
    package = _create_package(db_session, admin_id)

    updated = package_service.update_package(
        db_session, package, PackageUpdate(status=ReviewStatus.APPROVED)
    )

    assert updated.status is ReviewStatus.APPROVED
    assert updated.name == "Europa Capitales"


def test_update_package_rejects_collision_with_other_package(db_session, admin_id):
    _create_package(db_session, admin_id, name="Otro", destination="Roma")
    package = _create_package(db_session, admin_id)

    with pytest.raises(ValueError, match="already exists"):
        package_service.update_package(
            db_session, package, PackageUpdate(name="Otro", destination="Roma")
        )


def test_update_package_allows_keeping_its_own_values(db_session, admin_id):
    package = _create_package(db_session, admin_id)

    updated = package_service.update_package(
        db_session,
        package,
        PackageUpdate(name="Europa Capitales", destination="París"),
    )

    assert updated.name == "Europa Capitales"


def test_delete_package_removes_it(db_session, admin_id):
    package = _create_package(db_session, admin_id)

    package_service.delete_package(db_session, package)

    assert package_service.get_package(db_session, package.id) is None


def test_list_packages_filters_by_status(db_session, admin_id):
    approved = _create_package(db_session, admin_id, name="A", destination="Roma")
    _create_package(db_session, admin_id, name="B", destination="Roma")
    package_service.update_package(
        db_session, approved, PackageUpdate(status=ReviewStatus.APPROVED)
    )

    result = package_service.list_packages(db_session, ReviewStatus.APPROVED)

    assert [p.id for p in result] == [approved.id]


@pytest.fixture
def category_ids(db_session):
    """Ids of three stored categories, in creation order."""
    return [
        category_service.create_category(db_session, CategoryCreate(name=name)).id
        for name in ("Cultura", "Gastronomia", "Aventura")
    ]


def _set_categories(db_session, package, ids):
    return package_service.set_package_categories(
        db_session, package, PackageCategoriesUpdate(category_ids=ids)
    )


def _category_ids(package):
    return {category.id for category in package.categories}


def _approve(db_session, package):
    package_service.update_package(db_session, package, PackageUpdate(status=ReviewStatus.APPROVED))


def test_set_package_categories_stores_them(db_session, admin_id, category_ids):
    package = _create_package(db_session, admin_id)

    updated = _set_categories(db_session, package, category_ids[:2])

    assert _category_ids(updated) == set(category_ids[:2])


def test_set_package_categories_replaces_the_previous_ones(db_session, admin_id, category_ids):
    package = _create_package(db_session, admin_id)
    _set_categories(db_session, package, category_ids[:2])

    updated = _set_categories(db_session, package, category_ids[1:])

    assert _category_ids(updated) == set(category_ids[1:])


def test_set_package_categories_with_empty_list_removes_them(db_session, admin_id, category_ids):
    package = _create_package(db_session, admin_id)
    _set_categories(db_session, package, category_ids)

    updated = _set_categories(db_session, package, [])

    assert updated.categories == []


def test_set_package_categories_ignores_order_and_repeats(db_session, admin_id, category_ids):
    first, second, _ = category_ids
    package = _create_package(db_session, admin_id)
    _set_categories(db_session, package, [first, second])
    _approve(db_session, package)

    updated = _set_categories(db_session, package, [second, first, first])

    assert _category_ids(updated) == {first, second}
    assert updated.status is ReviewStatus.APPROVED


def test_set_package_categories_sends_approved_package_back_to_pending(
    db_session, admin_id, category_ids
):
    package = _create_package(db_session, admin_id)
    _set_categories(db_session, package, category_ids[:1])
    _approve(db_session, package)

    updated = _set_categories(db_session, package, category_ids[:2])

    assert updated.status is ReviewStatus.PENDING


@pytest.mark.parametrize("status", [ReviewStatus.PENDING, ReviewStatus.REJECTED])
def test_set_package_categories_keeps_status_when_not_approved(
    db_session, admin_id, category_ids, status
):
    package = _create_package(db_session, admin_id)
    package_service.update_package(db_session, package, PackageUpdate(status=status))

    updated = _set_categories(db_session, package, category_ids)

    assert updated.status is status


def test_set_package_categories_with_unknown_category_raises_and_changes_nothing(
    db_session, admin_id, category_ids
):
    package = _create_package(db_session, admin_id)
    _set_categories(db_session, package, category_ids[:1])
    _approve(db_session, package)

    with pytest.raises(LookupError, match=r"Categories not found: \[998, 999\]"):
        _set_categories(db_session, package, [category_ids[0], 999, 998])

    db_session.refresh(package)
    assert _category_ids(package) == set(category_ids[:1])
    assert package.status is ReviewStatus.APPROVED
