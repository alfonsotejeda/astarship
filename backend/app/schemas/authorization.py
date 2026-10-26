"""Authorization schema."""

from pydantic import BaseModel

from app.schemas.base import ORMSchema


class AuthorizationUpsert(BaseModel):
    """Fields set when granting or replacing a guide's authorization on a package."""

    can_generate: bool = False
    can_validate: bool = False


class AuthorizationRead(ORMSchema):
    """Authorization fields returned by the API."""

    guide_id: int
    package_id: int
    can_generate: bool
    can_validate: bool
