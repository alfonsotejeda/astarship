"""PackageValidation service."""

from sqlalchemy import select, update
from sqlalchemy.orm import Session, joinedload

from app.models.package import Package
from app.models.package_validation import PackageValidation
from app.models.status import ReviewStatus, ValidationResult
from app.models.user.operations_manager import OperationsManager
from app.schemas.package_validation import PackageValidationCreate

_STATUS_BY_RESULT = {
    ValidationResult.APPROVED: ReviewStatus.APPROVED,
    ValidationResult.REJECTED: ReviewStatus.REJECTED,
}


def list_validations(db: Session, package_id: int) -> list[PackageValidation]:
    """Return the validations of a package, the most recent first."""
    statement = (
        select(PackageValidation)
        .options(
            joinedload(PackageValidation.manager).joinedload(OperationsManager.user)
        )
        .where(PackageValidation.package_id == package_id)
        .order_by(PackageValidation.validation_date.desc())
    )
    return list(db.scalars(statement))


def create_validation(
    db: Session, package: Package, manager_id: int, data: PackageValidationCreate
) -> PackageValidation:
    """Record a validation and move the package to the status its result decides.

    Both changes are committed together, so a package never changes status without a
    validation to explain it. The latest validation determines the package's status.
    """
    if package.status != ReviewStatus.PENDING:
        raise ValueError("Only pending packages can be validated")
    new_status = _STATUS_BY_RESULT[data.result]
    updated = db.execute(
        update(Package)
        .where(Package.id == package.id, Package.status == ReviewStatus.PENDING)
        .values(status=new_status)
    )
    if updated.rowcount == 0:
        db.rollback()
        raise ValueError("Only pending packages can be validated")
    validation = PackageValidation(
        package_id=package.id, manager_id=manager_id, **data.model_dump()
    )
    db.add(validation)
    db.commit()
    db.refresh(validation)
    db.refresh(package)
    return validation
