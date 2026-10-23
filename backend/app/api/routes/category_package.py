""" Category Package routers"""


from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.category_package import CategoryPackageCreate, CategoryPackageUpdate, CategoryPackageRead
from app.schemas.category import CategoryRead, CategoryCreate, CategoryUpdate
from app.schemas.package import PackageCreate, PackageRead, PackageUpdate
from app.services import category_package as cp_sv


router = APIRouter(prefix="/categories_packages", tags=["categories_packages"])

@router.get("", response_model= list[CategoryRead])
def get_categories_by_package(package_id: int, db : Session = Depends(get_db)) -> list[CategoryRead]:
    try: 
        return cp_sv.categories_by_package(package_id, db) 
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))

@router.get("/packages_by_category", response_model=list[PackageRead])
def get_packages_by_category(category_id: int, db: Session = Depends(get_db)) -> list[PackageRead]:
    try:
        return cp_sv.packages_by_category(category_id, db)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))

@router.get("/relation", response_model=list[CategoryPackageRead])
def get_relations(db: Session = Depends(get_db)):
    return cp_sv.get_relations(db)

@router.post("/create_rows", response_model=CategoryPackageRead, status_code=status.HTTP_201_CREATED)
def post_create_rows(data: CategoryPackageCreate, db: Session = Depends(get_db)) -> CategoryPackageRead:
    try:
        return cp_sv.create_relation(data, db)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error))

@router.delete("/rows", status_code=status.HTTP_204_NO_CONTENT)
def delete_relations(category_id: int, package_id: int, db: Session = Depends(get_db)):
    try:
        cp_sv.delete_relation(category_id, package_id, db)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error