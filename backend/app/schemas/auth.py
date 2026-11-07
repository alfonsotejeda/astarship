"""Auth schema."""

from pydantic import BaseModel, ConfigDict

from app.schemas.authorization import AuthorizationRead
from app.schemas.user import GuideRead, UserRead


class LoginRequest(BaseModel):
    """Credentials sent to log in."""

    model_config = ConfigDict(extra="forbid")

    email: str
    password: str


class Token(BaseModel):
    """Access token returned after a successful login."""

    access_token: str
    token_type: str = "bearer"


class CurrentGuideRead(GuideRead):
    """Guide fields of the current user, with its package authorizations."""

    authorizations: list[AuthorizationRead]


class CurrentUserRead(UserRead):
    """The authenticated user, its role and, if a guide, its authorizations."""

    guide: CurrentGuideRead | None = None
