"""Category routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryRead
from app.services import category as category_sv

router = APIRouter(prefix="/categories", tags=["categories"])


def get_category(db: Session, category_id: int):
    """Return a category by its ID."""

    category = category_sv.category_by_id(db, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category



@router.get("", response_model=list[CategoryRead])
def list_categories(db: Session = Depends(get_db)) -> list[CategoryRead]:
    """List all categories."""
    return category_sv.list_categories(db)



@router.get("/{category_id}", response_model=CategoryRead)
def get_category_by_id(category_id: int, db: Session = Depends(get_db)) -> CategoryRead:
    """Return a category by its ID."""
    return get_category(db, category_id)



@router.get("/name/{category_name}", response_model=CategoryRead)
def get_category_name(category_name: str, db: Session = Depends(get_db)) -> CategoryRead:
    """Return a category by its name."""
    category = category_sv.category_by_name(db, category_name)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category



@router.post("/create", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category_end(data: CategoryCreate, db: Session = Depends(get_db)) -> CategoryRead:
    """Create a new category."""
    try:
        return category_sv.create_category(db, data)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error



@router.put("/{category_id}", response_model=CategoryRead)
def update_category(
    data: CategoryUpdate, category_id: int, db: Session = Depends(get_db)
) -> CategoryRead:
    """Update a category."""
    category = get_category(db, category_id)
    try:
        return category_sv.update_category(db, category, data)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error



@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: Session = Depends(get_db)) -> None:
    """Delete a category."""
    category = get_category(db, category_id)
    try:
        return category_sv.delete_category(db, category)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
