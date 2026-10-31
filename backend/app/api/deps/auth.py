"""Authentication dependencies: who is calling and with which role."""

from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user.user import User, UserRole

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Return the user identified by the bearer token or raise a 401."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    user_id = decode_access_token(credentials.credentials)
    user = db.get(User, user_id) if user_id is not None else None
    if user is None:
        raise unauthorized
    return user


def require_role(*roles: UserRole) -> Callable[..., User]:
    """Return a dependency that lets through only users whose subtype is one of the roles."""

    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Role not allowed for this action"
            )
        return user

    return dependency


require_admin = require_role(UserRole.ADMIN)
require_guide = require_role(UserRole.GUIDE)
require_operations_manager = require_role(UserRole.OPERATIONS_MANAGER)
require_tourist = require_role(UserRole.TOURIST)
