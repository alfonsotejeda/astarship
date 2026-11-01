"""Permission service."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.permission import Permission
from app.schemas.permission import PermissionCreate


def list_permissions(db: Session) -> list[Permission]:
    """Return all permissions."""
    stmt = select(Permission)
    return list(db.scalars(stmt))


def get_permission(db: Session, name: str) -> Permission | None:
    """Return a permission by name, or None if it doesn't exist."""
    stmt = db.get(Permission, name)
    return stmt


def create_permission(db: Session, data: PermissionCreate) -> Permission:
    """Create and persist a new permission."""
    permission = Permission(name=data.name)
    db.add(permission)
    db.commit()
    db.refresh(permission)
    return permission


def delete_permission(db: Session, permission: Permission) -> None:
    """Delete a permission."""
    db.delete(permission)
    db.commit()
