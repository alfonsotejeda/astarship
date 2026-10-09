"""Permission routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.permission import PermissionCreate, PermissionRead
from app.services import permission as permission_sv

router = APIRouter(prefix="/permissions", tags=["permissions"])

def _get_permission_or_404(db: Session, name: str):
    """Return the permission or raise a 404."""

    permission = permission_sv.get_permission(db, name)
    if permission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permission not found")
    
    return permission

@router.get("", response_model=list[PermissionRead])
def list_permissions(db: Session = Depends(get_db)) -> list[PermissionRead]:
    """List all permissions."""

    return permission_sv.list_permissions(db)

@router.get("/{name}", response_model = PermissionRead)
def get_permission(name: str, db: Session = Depends(get_db)) -> PermissionRead:
    """Get a single permission by name."""

    return _get_permission_or_404(db, name)

@router.post("", response_model=PermissionRead, status_code=status.HTTP_201_CREATED)
def create_permission(data: PermissionCreate, db: Session = Depends(get_db)) -> PermissionRead:
    """Create a new permission."""

    permission_exist = permission_sv.get_permission(db, data.name)
    if permission_exist:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Permission already exists")
    
    return permission_sv.create_permission(db, data)

@router.delete("/{name}", response_model = None, status_code=status.HTTP_204_NO_CONTENT)
def delete_permission(name: str, db: Session = Depends(get_db)) -> None:
    """Delete a permission."""

    permission = _get_permission_or_404(db, name)
    permission_sv.delete_permission(db, permission)