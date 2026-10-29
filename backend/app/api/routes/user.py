"""User routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services import activity_validation as activity_validation_service
from app.services import travel_group as travel_group_service
from app.services import user as user_service

router = APIRouter(prefix="/users", tags=["users"])


def _get_user_or_404(db: Session, user_id: int):
    """Return the user or raise a 404."""
    user = user_service.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.get("", response_model=list[UserRead])
def list_users(db: Session = Depends(get_db)) -> list[UserRead]:
    """List all users."""
    return user_service.list_users(db)


@router.get("/{user_id}", response_model=UserRead)
def get_user(user_id: int, db: Session = Depends(get_db)) -> UserRead:
    """Get a single user by id."""
    return _get_user_or_404(db, user_id)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, db: Session = Depends(get_db)) -> UserRead:
    """Create a new user with the subtype given by its role."""
    return user_service.create_user(db, data)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db)) -> UserRead:
    """Update an existing user; only the subtype of its role can be sent."""
    user = _get_user_or_404(db, user_id)
    foreign = user_service.foreign_subtypes(user, data)
    if foreign:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"User with role {user.role} cannot update: {', '.join(foreign)}",
        )
    return user_service.update_user(db, user, data)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db)) -> None:
    """Delete a user unless it is a guide with groups or an admin with packages or validations."""
    user = _get_user_or_404(db, user_id)
    if user.guide is not None and travel_group_service.guide_attends_travel_groups(db, user.id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Guide still attends travel groups"
        )
    if user.admin is not None and user.admin.packages:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Admin still generates packages"
        )
    if user.admin is not None and activity_validation_service.admin_has_validations(db, user.id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Admin still has activity validations"
        )
    user_service.delete_user(db, user)
