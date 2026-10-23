""" Category Package routers"""


from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.category_package import CategoryPackage
from app.models.category import Category
from app.models.package import Package
from app.schemas.category_package import CategoryPackageCreate,  CategoryPackageRead
from app.schemas.category import CategoryRead
from app.schemas.package import  PackageRead
from app.services import category_package as cp_sv


router = APIRouter(prefix="/categories_packages", tags=["categories_packages"])

@router.get("/categories_by_package/{package_id}", response_model= list[CategoryRead])
def get_categories_by_package(package_id: int, db : Session = Depends(get_db)) -> list[Category]:
    try: 
        return cp_sv.categories_by_package(package_id, db) 
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

@router.get("/packages_by_category/{category_id}", response_model=list[PackageRead])
def get_packages_by_category(category_id: int, db: Session = Depends(get_db)) -> list[Package]:
    try:
        return cp_sv.packages_by_category(category_id, db)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

@router.get("/relation", response_model=list[CategoryPackageRead])
def get_relations(db: Session = Depends(get_db)) -> list[CategoryPackage]:
    return cp_sv.get_relations(db)

@router.post("/create_rows", response_model=CategoryPackageRead, status_code=status.HTTP_201_CREATED)
def post_create_rows(data: CategoryPackageCreate, db: Session = Depends(get_db)) -> CategoryPackage:
    try:
        return cp_sv.create_relation(data, db)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    
@router.delete("/rows/{category_id}/{package_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_relations(category_id: int, package_id: int, db: Session = Depends(get_db)) -> None:
    try:
        cp_sv.delete_relation(category_id, package_id, db)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error