"""Authenticated user-specific routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import require_tourist
from app.db.session import get_db
from app.models.user.user import User
from app.schemas.today import TodayRead
from app.services import today as today_service

router = APIRouter(tags=["me"])


@router.get("/me/today", response_model=TodayRead | None)
def read_today(user: User = Depends(require_tourist), db: Session = Depends(get_db)):
    """Return the authenticated tourist's itinerary for the current date."""
    return today_service.get_today(db, user.id)