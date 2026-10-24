"""User service."""

import bcrypt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user.admin import Admin
from app.models.user.guide import Guide
from app.models.user.operations_manager import OperationsManager
from app.models.user.tourist import Tourist
from app.models.user.user import User, UserRole
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


def get_guide(db: Session, guide_id: int) -> Guide | None:
    """Return a guide by id, or None if the user doesn't exist or isn't a guide."""
    return db.get(Guide, guide_id)


def create_user(db: Session, data: UserCreate) -> User:
    """Create and persist a new user together with its subtype row."""
    user = User(
        name=data.name,
        email=data.email,
        password_hash=_hash_password(data.password),
    )
    subtype_values = data.model_dump(exclude={"name", "email", "password", "role"})

    SUBTYPE_MODELS = {
        UserRole.ADMIN: Admin,
        UserRole.GUIDE: Guide,
        UserRole.OPERATIONS_MANAGER: OperationsManager,
        UserRole.TOURIST: Tourist,
    }

    setattr(user, data.role.value, SUBTYPE_MODELS[data.role](**subtype_values))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def foreign_subtypes(user: User, data: UserUpdate) -> list[str]:
    """Return the subtypes sent in the update that don't match the user's role."""
    return [
        name
        for name in ("guide", "tourist")
        if getattr(data, name) is not None and name != user.role
    ]


def update_user(db: Session, user: User, data: UserUpdate) -> User:
    """Apply partial updates to an existing user and its subtype row."""
    updates = data.model_dump(exclude_unset=True, exclude={"guide", "tourist"})
    password = updates.pop("password", None)
    
    for field, value in updates.items():
        setattr(user, field, value)
        
    subtype_data = getattr(data, user.role.value, None)
    
    if subtype_data is not None:
        subtype = getattr(user, user.role.value)
        
        for field, value in subtype_data.model_dump(exclude_unset=True, exclude_none=True).items():
            setattr(subtype, field, value)
    
    if password is not None:
        user.password_hash = _hash_password(password)
    
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user: User) -> None:
    """Delete a user and its subtype row."""
    db.delete(user)
    db.commit()
