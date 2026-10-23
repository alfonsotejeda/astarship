"""Authorization service."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.authorization import Authorization
from app.models.user.guide import Guide
from app.schemas.authorization import AuthorizationUpsert


def get_guide(db: Session, guide_id: int) -> Guide | None:
    """Return a guide by id, or None if it doesn't exist."""
    return db.get(Guide, guide_id)


def list_authorizations(db: Session, package_id: int) -> list[Authorization]:
    """Return all guide authorizations on a package."""
    statement = select(Authorization).where(Authorization.package_id == package_id)
    return list(db.scalars(statement))


def list_guide_authorizations(db: Session, guide_id: int) -> list[Authorization]:
    """Return all package authorizations of a guide."""
    statement = select(Authorization).where(Authorization.guide_id == guide_id)
    return list(db.scalars(statement))


def get_authorization(db: Session, package_id: int, guide_id: int) -> Authorization | None:
    """Return the authorization of a guide on a package, or None if it doesn't exist."""
    return db.get(Authorization, (guide_id, package_id))


def create_authorization(
    db: Session, package_id: int, guide_id: int, data: AuthorizationUpsert
) -> Authorization:
    """Grant a guide an authorization on a package."""
    authorization = Authorization(
        guide_id=guide_id,
        package_id=package_id,
        can_generate=data.can_generate,
        can_validate=data.can_validate,
    )
    db.add(authorization)
    db.commit()
    db.refresh(authorization)
    return authorization


def update_authorization(
    db: Session, authorization: Authorization, data: AuthorizationUpsert
) -> Authorization:
    """Replace the flags of an existing authorization."""
    authorization.can_generate = data.can_generate
    authorization.can_validate = data.can_validate
    db.commit()
    db.refresh(authorization)
    return authorization


def delete_authorization(db: Session, authorization: Authorization) -> None:
    """Revoke the authorization of a guide on a package."""
    db.delete(authorization)
    db.commit()
