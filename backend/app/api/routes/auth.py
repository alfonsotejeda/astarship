"""Auth routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.core.security import create_access_token
from app.db.session import get_db
from app.models.user.user import User
from app.schemas.auth import CurrentUserRead, LoginRequest, Token
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(data: LoginRequest, db: Session = Depends(get_db)) -> Token:
    """Exchange email and password for an access token."""
    user = auth_service.authenticate(db, data.email, data.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(access_token=create_access_token(user.id))


@router.get("/me", response_model=CurrentUserRead)
def read_current_user(user: User = Depends(get_current_user)) -> CurrentUserRead:
    """Return the authenticated user."""
    return user
