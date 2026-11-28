"""Package service."""

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.coverage import Coverage
from app.models.package import Package
from app.models.status import ReviewStatus
from app.schemas.package import PackageCategoriesUpdate, PackageCreate, PackageUpdate


def list_packages(db: Session, status: ReviewStatus | None = None) -> list[Package]:
    """Return all packages, optionally only those with the given status."""
    statement = select(Package)
    if status is not None:
        statement = statement.where(Package.status == status)
    return list(db.scalars(statement))


def get_package(db: Session, package_id: int) -> Package | None:
    """Return a package by id, or None if it doesn't exist."""
    return db.get(Package, package_id)


def find_package_by_name_destination(
    db: Session, name: str, destination: str, exclude_id: int | None = None
) -> Package | None:
    """Return a package with the given name and destination, if any.

    Args:
        db: Database session.
        name: Package name to match.
        destination: Package destination to match.
        exclude_id: Package id to ignore, used when updating a package itself.

    Returns:
        The matching package, or None when no other package uses the pair.
    """
    statement = select(Package).where(Package.name == name, Package.destination == destination)
    if exclude_id is not None:
        statement = statement.where(Package.id != exclude_id)
    return db.scalars(statement).first()


def create_package(db: Session, data: PackageCreate) -> Package:
    """Create and persist a new package, always pending on creation.

    Args:
        db: Database session.
        data: Creation payload with name, destination and the generating admin.

    Returns:
        The persisted package.

    Raises:
        ValueError: If another package already uses the same name and destination.
    """
    if find_package_by_name_destination(db, data.name, data.destination) is not None:
        raise ValueError("Package with this name and destination already exists")
    package = Package(name=data.name, destination=data.destination, admin_id=data.admin_id)
    db.add(package)
    db.commit()
    db.refresh(package)
    return package


def update_package(db: Session, package: Package, data: PackageUpdate) -> Package:
    """Apply partial updates to an existing package.

    Fields sent as `null` are treated as not sent, since no Package column is nullable.

    Args:
        db: Database session.
        package: Package to update.
        data: Payload with only the fields that change.

    Returns:
        The updated package.

    Raises:
        ValueError: If the update collides with another package's name and destination.
    """
    updates = {
        field: value
        for field, value in data.model_dump(exclude_unset=True).items()
        if value is not None
    }
    name = updates.get("name", package.name)
    destination = updates.get("destination", package.destination)
    clash = find_package_by_name_destination(db, name, destination, exclude_id=package.id)
    if clash is not None:
        raise ValueError("Package with this name and destination already exists")
    for field, value in updates.items():
        setattr(package, field, value)
    db.commit()
    db.refresh(package)
    return package


def set_package_categories(db: Session, package: Package, data: PackageCategoriesUpdate) -> Package:
    """Replace the categories a package covers.

    RN-11: if the categories change and the package was approved, it goes back to pending.

    Args:
        db: Database session.
        package: Package whose categories are replaced.
        data: Ids of every category the package must cover; order and repeats don't matter.

    Returns:
        The package with its new categories.

    Raises:
        LookupError: If any of the categories doesn't exist.
    """
    # Part 2: every requested category must exist
    wanted = set(data.category_ids)
    found = set(db.scalars(select(Category.id).where(Category.id.in_(wanted))))
    missing = wanted - found
    if missing:
        raise LookupError(f"Categories not found: {sorted(missing)}")

    # Part 3: nothing to do if the set of categories is the same
    current = {category.id for category in package.categories}
    if wanted == current:
        return package

    # Part 4: replace the coverage rows and apply RN-11, all in one transaction
    db.execute(delete(Coverage).where(Coverage.package_id == package.id))
    db.add_all(Coverage(package_id=package.id, category_id=category_id) for category_id in wanted)
    if package.status == ReviewStatus.APPROVED:
        package.status = ReviewStatus.PENDING
    db.commit()
    db.refresh(package)
    return package


def delete_package(db: Session, package: Package) -> None:
    """Delete a package."""
    db.delete(package)
    db.commit()
