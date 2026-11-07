"""Category service."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate


def list_categories(db: Session) -> list[Category]:
    """list_categories returns a list of categories."""
    stmt = select(Category).order_by(Category.id)
    return db.scalars(stmt).all()


def category_by_id(db: Session, category_id: int) -> Category | None:
    """Get a Category by its id."""
    stmt = select(Category).where(Category.id == category_id)
    return db.scalar(stmt)


def category_by_name(db: Session, name: str) -> Category | None:
    """Get a category by its name."""
    stmt = select(Category).where(Category.name == name)
    return db.scalar(stmt)


def create_category(db: Session, data: CategoryCreate) -> Category:
    """create_category creates a new category."""
    exist = category_by_name(db, data.name)
    if exist:
        raise ValueError("Category with that name already exists")

    new_category = Category(name=data.name)
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category


def update_category(db: Session, up_category: Category, data: CategoryUpdate) -> Category:
    """update_category updates an existing category."""
    exist_other_category = db.scalar(
        select(Category).where(Category.name == data.name, Category.id != up_category.id)
    )

    if exist_other_category:
        raise ValueError("Category with that name already exists")

    up_category.name = data.name
    db.commit()
    db.refresh(up_category)
    return up_category


def delete_category(db: Session, category: Category) -> None:
    """delete_category deletes an existing category."""
    if category.activities:
        raise ValueError("Cannot delete a category with existing activities")
    db.delete(category)
    db.commit()

def activities_by_category(db: Session, category_id: int) -> list[Activity]:
    """activities_by_category returns a list of activities for a given category."""
    category = db.get(Category, category_id)
    if category is None:
        raise LookupError("Category does not exist")

    stmt = select(Activity).where(Activity.category_id == category_id).order_by(Activity.name)
    return list(db.scalars(stmt))



def activities_count_by_categories(db: Session) -> list[tuple[Category, int]]:
    """Return each category with its activity count."""
    stmt = (
        select(Category, func.count(Activity.id))
        .outerjoin(Activity, Activity.category_id == Category.id)
        .group_by(Category.id)
        .order_by(Category.id)
    )
    return [(category, total) for category, total in db.execute(stmt)]
