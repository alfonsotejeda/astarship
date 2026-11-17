"""Category Package service"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.coverage import Coverage
from app.models.package import Package
from app.models.category import Category
from app.schemas.coverage import CoverageCreate

# Auxiliary Methods
def get_category_or_raise(category_id: int, db:Session) -> Category:
    """Return the category with the given ID or raise an error if it does not exist."""
    category = db.get(Category, category_id)
    if category is None:
        raise LookupError("Category not found")
    return category

def get_package_or_raise(package_id: int, db: Session) -> Package:
    """Return the package with the given ID or raise an error if it does not exist."""
    package = db.get(Package, package_id)
    if package is None:
        raise LookupError("Package not found")
    return package

def get_relation(category_id: int, package_id: int, db: Session) -> Coverage:
    category = get_category_or_raise(category_id, db)
    package = get_package_or_raise(package_id, db)
    return db.get(Coverage, (category_id, package_id))

# Relationhip queries
def categories_by_package(package_id: int, db: Session) -> list[Category]:
    """Return all categories associated with the specified package."""
    package = get_package_or_raise(package_id, db)
    list_category = [c.category for c in package.package_categories]
    return list_category


def packages_by_category(category_id: int, db: Session) -> list[Package]:
    """Return all packages associated with the specified category."""
    category = get_category_or_raise(category_id, db)
    list_packages = [p.package for p in category.category_packages]
    return list_packages


def get_relations(db: Session) -> list[Coverage]:
    """Return all category-package association records."""
    stmt = select(Coverage)
    return list(db.scalars(stmt))


def create_relation(data: CoverageCreate, db: Session) -> Coverage:
    """Create and return a category-package association after validating both records."""
    category = get_category_or_raise(data.category_id, db)
    package = get_package_or_raise(data.package_id, db)

    if db.get(Coverage, (category.id, package.id)):
        raise ValueError("This category-package relation already exists")
    new_category_package = Coverage(category_id = data.category_id, package_id = data.package_id)
    db.add(new_category_package)
    db.commit()
    db.refresh(new_category_package)
    return new_category_package


def delete_relation(category_id: int , package_id: int, db: Session) -> None:
    """Delete the specified category-package association."""
    category_package = get_relation(category_id, package_id, db) 
    if  category_package is None:
        raise LookupError("Relation not found")
    db.delete(category_package)
    db.commit()
    