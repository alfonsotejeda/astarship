"""Me routes: current user's own bookings."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.db.session import get_db
from app.models.user.user import User
from app.schemas.booking import BookingRead
from app.services import booking as booking_service
from app.api.routes.booking import _to_read

router = APIRouter(prefix="/me", tags=["me"])


@router.get("/bookings", response_model=list[BookingRead])
def list_my_bookings(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[BookingRead]:
    """Return the authenticated user's own bookings, most recent first."""
    bookings = booking_service.list_bookings(
        db, tourist_id=current_user.id, descending=True
    )
    return [_to_read(b) for b in bookings]
