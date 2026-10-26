"""Membership routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.membership import MembershipRead
from app.services import membership as membership_service
from app.services import travel_group as travel_group_service
from app.services import user as user_service

router = APIRouter(prefix="/travel-groups/{travel_group_id}/tourists", tags=["memberships"])


@router.post("/{tourist_id}", response_model=MembershipRead, status_code=status.HTTP_201_CREATED)
def add_tourist(
    travel_group_id: int, tourist_id: int, db: Session = Depends(get_db)
) -> MembershipRead:
    """Add a tourist to a travel group."""
    if travel_group_service.get_travel_group(db, travel_group_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="TravelGroup not found"
        )
    if user_service.get_tourist(db, tourist_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tourist not found")
    if membership_service.get_membership(db, travel_group_id, tourist_id) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Tourist already in travel group"
        )
    return membership_service.create_membership(db, travel_group_id, tourist_id)


@router.delete("/{tourist_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_tourist(travel_group_id: int, tourist_id: int, db: Session = Depends(get_db)) -> None:
    """Remove a tourist from a travel group."""
    membership = membership_service.get_membership(db, travel_group_id, tourist_id)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")
    membership_service.delete_membership(db, membership)
