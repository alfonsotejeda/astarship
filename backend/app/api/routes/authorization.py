"""Authorization routes."""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.authorization import AuthorizationRead, AuthorizationUpsert
from app.services import authorization as authorization_service
from app.services import package as package_service

router = APIRouter(prefix="/authorizations", tags=["authorizations"])


def _ensure_package_exists(db: Session, package_id: int) -> None:
    """Raise a 404 if the package doesn't exist."""
    if package_service.get_package(db, package_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")


@router.get("/packages/{package_id}", response_model=list[AuthorizationRead])
def list_authorizations(package_id: int, db: Session = Depends(get_db)) -> list[AuthorizationRead]:
    """List the guides authorized on a package."""
    _ensure_package_exists(db, package_id)
    return authorization_service.list_authorizations(db, package_id)


@router.put("/packages/{package_id}/guides/{guide_id}", response_model=AuthorizationRead)
def put_authorization(
    package_id: int,
    guide_id: int,
    data: AuthorizationUpsert,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthorizationRead:
    """Grant a guide an authorization on a package, or replace the existing one."""
    _ensure_package_exists(db, package_id)
    if authorization_service.get_guide(db, guide_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")
    authorization = authorization_service.get_authorization(db, package_id, guide_id)
    if authorization is not None:
        return authorization_service.update_authorization(db, authorization, data)
    response.status_code = status.HTTP_201_CREATED
    return authorization_service.create_authorization(db, package_id, guide_id, data)


@router.delete("/packages/{package_id}/guides/{guide_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_authorization(package_id: int, guide_id: int, db: Session = Depends(get_db)) -> None:
    """Revoke a guide's authorization on a package."""
    authorization = authorization_service.get_authorization(db, package_id, guide_id)
    if authorization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Authorization not found"
        )
    authorization_service.delete_authorization(db, authorization)


@router.get("/guides/{guide_id}", response_model=list[AuthorizationRead])
def list_guide_authorizations(
    guide_id: int, db: Session = Depends(get_db)
) -> list[AuthorizationRead]:
    """List the packages a guide is authorized on."""
    if authorization_service.get_guide(db, guide_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guide not found")
    return authorization_service.list_guide_authorizations(db, guide_id)
