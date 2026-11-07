"""Business rules checked before running a protected action."""

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.db.session import get_db
from app.models.itinerary import Itinerary
from app.models.package import Package
from app.models.status import ReviewStatus
from app.models.user.user import User, UserRole


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


def forbid_acting_for_others(user: User, owner_id: int) -> None:
    """Raise a 403 if the user acts on a record of someone else; admins act on any record."""
    if user.role is not UserRole.ADMIN and user.id != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Users can only act on their own records"
        )


def require_itinerary_author(
    itinerary_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """Let through only the guide that generated the `itinerary_id` itinerary, or an admin."""
    itinerary = db.get(Itinerary, itinerary_id)
    if itinerary is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Itinerary not found")
    forbid_acting_for_others(user, itinerary.guide_id)
    return user
