"""Category service."""

import bcrypt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate

# Consultas de lectura

# 1) Se debe de devolver una lista de categorías
def list_categories(db: Session) -> list[Category]:
    """list_categories returns a list of categories."""

    stmt = select(Category)  # Ejecuta la query para seleccionar todas las categorías de la tabla "Category"
    return db.scalars(stmt).all() # Convierte el resultado de la query en una lista de objetos "Category" y la devuelve

    #scalars ejecuta la query y devuelve un objeto iterable que contiene los resultados de la query, en este caso, los objetos "Category" que cumplen con la condición de la query. Luego, el método all() convierte ese objeto iterable en una lista de objetos "Category" y la devuelve.
    
# 2) Se debe de poder obtener una categoría por su id
def category_by_id(db: Session, category_id: int) -> Category | None:
    """Get a Category by its id."""
    stmt = select(Category).where(Category.id == category_id)
    return db.scalar(stmt)


# 3) Se debe de poder obtener una categoría por su nombre
def category_by_name(db:Session, name:str) -> Category | None:
    """Get a category by its name."""
    stmt = select(Category).where(Category.name == name)
    return db.scalar(stmt)


# Consulta de escritura en la base de datos

# 1) Se debe de poder crear una categoría
def create_category(db:Session, data: CategoryCreate) -> Category:
    """create_category creates a new category."""

    exist = category_by_name(db, data.name)
    if exist:
        raise ValueError("Category with that name already exists")
    
    new_category = Category(name = data.name)
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category


# 2) Se debe de poder actualizar una categoría
def update_category(db:Session, category_id: int, data:CategoryUpdate) -> Category:
    """update_category updates an existing category."""

    up_category = category_by_id(db, category_id)

    if not up_category:
        raise ValueError("Category not found")
    
    exist_other_category = db.scalar(select(Category).where(Category.name == data.name, Category.id != category_id))

    if exist_other_category:
        raise ValueError("Category with that name already exists")

    #Actualizar la categoria 
    up_category.name = data.name
    db.commit()
    db.refresh(up_category)
    return up_category


# 3) Se debe de poder eliminar una categoría
def delete_category(db: Session, category: Category) -> None:
    """delete_category deletes an existing category."""
    db.delete(category)
    db.commit()