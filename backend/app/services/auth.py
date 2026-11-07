"""Auth service."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.models.user.user import User


def authenticate(db: Session, email: str, password: str) -> User | None:
    """Return the user matching the credentials, or None if they are wrong."""
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(password, user.password_hash):
        return None
    return user