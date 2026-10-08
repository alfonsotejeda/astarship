"""User service."""

import bcrypt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


def _hash_password(password: str) -> str:
    """Hash a plain-text password."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def list_users(db: Session) -> list[User]:
    """Return all users."""
    return list(db.scalars(select(User)))


def get_user(db: Session, user_id: int) -> User | None:
    """Return a user by id, or None if it doesn't exist."""
    return db.get(User, user_id)


def create_user(db: Session, data: UserCreate) -> User:
    """Create and persist a new user."""
    user = User(
        name=data.name,
        role=data.role,
        email=data.email,
        password_hash=_hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user: User, data: UserUpdate) -> User:
    """Apply partial updates to an existing user."""
    updates = data.model_dump(exclude_unset=True)
    password = updates.pop("password", None)
    for field, value in updates.items():
        setattr(user, field, value)
    if password is not None:
        user.password_hash = _hash_password(password)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user: User) -> None:
    """Delete a user."""
    db.delete(user)
    db.commit()
