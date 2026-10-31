"""Guide authorization on a package (RN-02)."""

from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.db.session import get_db
from app.models.authorization import Authorization
from app.models.user.user import User, UserRole


def check_guide_authorized(
    db: Session,
    user: User,
    package_id: int,
    *,
    can_generate: bool = False,
    can_validate: bool = False,
) -> None:
    """Raise a 403 unless the user is a guide with the requested flags on the package."""
    forbidden = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN, detail="Guide not authorized on this package"
    )
    if user.role is not UserRole.GUIDE:
        raise forbidden
    authorization = db.get(Authorization, (user.id, package_id))
    if authorization is None:
        raise forbidden
    if (can_generate and not authorization.can_generate) or (
        can_validate and not authorization.can_validate
    ):
        raise forbidden


def require_guide_authorized(
    *, can_generate: bool = False, can_validate: bool = False
) -> Callable[..., User]:
    """Return a dependency that checks the guide's flags on the `package_id` path parameter."""

    def dependency(
        package_id: int,
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        check_guide_authorized(
            db, user, package_id, can_generate=can_generate, can_validate=can_validate
        )
        return user

    return dependency


require_can_generate = require_guide_authorized(can_generate=True)
require_can_validate = require_guide_authorized(can_validate=True)
