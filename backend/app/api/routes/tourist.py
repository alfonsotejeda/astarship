"""Tourist routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user.tourist import Tourist
from app.schemas.package import PackageRead
from app.services import booking as booking_service
from app.services import membership as membership_service

router = APIRouter(prefix="/tourists", tags=["tourists"])


def _get_tourist_or_404(db: Session, tourist_id: int) -> Tourist:
    """Return the tourist or raise a 404."""
    tourist = membership_service.get_tourist(db, tourist_id)
    if tourist is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tourist not found")
    return tourist


@router.get("/{tourist_id}/packages", response_model=list[PackageRead])
def get_tourist_packages(
    tourist_id: int, db: Session = Depends(get_db)
) -> list[PackageRead]:
    """List all packages a tourist is booked into."""
    tourist = _get_tourist_or_404(db, tourist_id)
    return booking_service.get_packages_for_tourist(db, tourist.id)
