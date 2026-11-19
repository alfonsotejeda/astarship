"""PackageValidation routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_operations_manager
from app.db.session import get_db
from app.models.user.user import User
from app.schemas.package import PackageRead
from app.schemas.package_validation import PackageValidationCreate, PackageValidationRead
from app.services import package as package_service
from app.services import package_validation as validation_service

router = APIRouter(
    prefix="/packages/{package_id}/validations", tags=["package-validations"]
)


def _get_package_or_404(db: Session, package_id: int):
    """Return the package or raise a 404."""
    package = package_service.get_package(db, package_id)
    if package is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")
    return package


@router.get("", response_model=list[PackageValidationRead])
def list_validations(
    package_id: int, db: Session = Depends(get_db)
) -> list[PackageValidationRead]:
    """List the validations of a package, the most recent first."""
    _get_package_or_404(db, package_id)
    validations = validation_service.list_validations(db, package_id)
    return [
        PackageValidationRead(
            reviewer_id=v.manager_id,
            reviewer_name=v.manager.user.name,
            validation_date=v.validation_date,
            result=v.result,
            observations=v.observations,
        )
        for v in validations
    ]


@router.post(
    "",
    response_model=PackageRead,
    status_code=status.HTTP_201_CREATED,
)
def create_validation(
    package_id: int,
    data: PackageValidationCreate,
    user: User = Depends(require_operations_manager),
    db: Session = Depends(get_db),
) -> PackageRead:
    """Validate a package; its status becomes approved or rejected.

    The manager is the authenticated operations manager, never the request body.
    """
    package = _get_package_or_404(db, package_id)
    try:
        validation_service.create_validation(db, package, user.id, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return package
