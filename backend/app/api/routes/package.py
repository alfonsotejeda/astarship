"""Package routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.status import ReviewStatus
from app.schemas.package import PackageCreate, PackageRead, PackageUpdate
from app.schemas.user import TouristRead
from app.services import booking as booking_service
from app.services import package as package_service

router = APIRouter(prefix="/packages", tags=["packages"])


def _get_package_or_404(db: Session, package_id: int):
    """Return the package or raise a 404."""
    package = package_service.get_package(db, package_id)
    if package is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")
    return package


def _raise_conflict(db: Session, exc: Exception) -> None:
    """Raise a 409 for a (name, destination) collision.

    Rolls back only when the flush failed (IntegrityError); a ValueError
    from the pre-check leaves no pending state in the session.
    """
    if isinstance(exc, IntegrityError):
        db.rollback()
    conflict_detail = "Package with this name and destination already exists"
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=conflict_detail) from exc


@router.get("", response_model=list[PackageRead])
def list_packages(
    status: ReviewStatus | None = None, db: Session = Depends(get_db)
) -> list[PackageRead]:
    """List all packages, optionally filtered by status."""
    return package_service.list_packages(db, status)


@router.get("/{package_id}/tourists", response_model=list[TouristRead])
def get_package_tourists(package_id: int, db: Session = Depends(get_db)) -> list[TouristRead]:
    """List all tourists booked into a package."""
    package = _get_package_or_404(db, package_id)
    return booking_service.get_tourists_for_package(db, package.id)


@router.get("/{package_id}", response_model=PackageRead)
def get_package(package_id: int, db: Session = Depends(get_db)) -> PackageRead:
    """Get a single package by id."""
    return _get_package_or_404(db, package_id)


@router.post("", response_model=PackageRead, status_code=status.HTTP_201_CREATED)
def create_package(data: PackageCreate, db: Session = Depends(get_db)) -> PackageRead:
    """Create a new package; the name and destination pair must be unique."""
    try:
        return package_service.create_package(db, data)
    except (ValueError, IntegrityError) as exc:
        _raise_conflict(db, exc)


@router.patch("/{package_id}", response_model=PackageRead)
def update_package(
    package_id: int, data: PackageUpdate, db: Session = Depends(get_db)
) -> PackageRead:
    """Update an existing package; collisions on (name, destination) are rejected."""
    package = _get_package_or_404(db, package_id)
    try:
        return package_service.update_package(db, package, data)
    except (ValueError, IntegrityError) as exc:
        _raise_conflict(db, exc)


@router.delete("/{package_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_package(package_id: int, db: Session = Depends(get_db)) -> None:
    """Delete a package."""
    package = _get_package_or_404(db, package_id)
    package_service.delete_package(db, package)
