"""Health-check routes."""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    """Check that the API is up."""
    return {"status": "ok"}


@router.get("/health/db")
def health_db(db: Session = Depends(get_db)) -> dict[str, str]:
    """Check that the database responds."""
    version = db.execute(text("SELECT version()")).scalar_one()
    return {"status": "ok", "postgres": version}
