"""Business rules checked before running a protected action."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.package import Package
from app.models.status import ReviewStatus
from app.models.user.user import User


def get_approved_package(db: Session, package_id: int) -> Package:
    """Return the package, or raise a 404 if missing and a 409 if not approved (RN-09)."""
    package = db.get(Package, package_id)
    if package is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")
    if package.status is not ReviewStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Package is not approved")
    return package


def forbid_self_review(user: User, author_id: int | None) -> None:
    """Raise a 403 if the user is reviewing something they made (RN-10)."""
    if author_id is not None and user.id == author_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Users cannot review their own work"
        )
