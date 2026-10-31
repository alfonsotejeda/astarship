"""User routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_admin
from app.api.deps.rules import forbid_acting_for_others
from app.db.session import get_db
from app.models.user.user import User
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services import travel_group as travel_group_service
from app.services import user as user_service

router = APIRouter(prefix="/users", tags=["users"])


def _get_user_or_404(db: Session, user_id: int):
    """Return the user or raise a 404."""
    user = user_service.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.get("", response_model=list[UserRead], dependencies=[Depends(get_current_user)])
def list_users(db: Session = Depends(get_db)) -> list[UserRead]:
    """List all users."""
    return user_service.list_users(db)


@router.get("/{user_id}", response_model=UserRead, dependencies=[Depends(get_current_user)])
def get_user(user_id: int, db: Session = Depends(get_db)) -> UserRead:
    """Get a single user by id."""
    return _get_user_or_404(db, user_id)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, db: Session = Depends(get_db)) -> UserRead:
    """Create a new user with the subtype given by its role; public so users can sign up."""
    return user_service.create_user(db, data)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserRead:
    """Update an existing user; only the subtype of its role can be sent."""
    forbid_acting_for_others(current_user, user_id)
    user = _get_user_or_404(db, user_id)
    foreign = user_service.foreign_subtypes(user, data)
    if foreign:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"User with role {user.role} cannot update: {', '.join(foreign)}",
        )
    return user_service.update_user(db, user, data)


@router.delete(
    "/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)]
)
def delete_user(user_id: int, db: Session = Depends(get_db)) -> None:
    """Delete a user unless it is a guide attending groups or an admin generating packages."""
    user = _get_user_or_404(db, user_id)
    if user.guide is not None and travel_group_service.guide_attends_travel_groups(db, user.id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Guide still attends travel groups"
        )
    if user.admin is not None and user.admin.packages:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Admin still generates packages"
        )
    user_service.delete_user(db, user)
