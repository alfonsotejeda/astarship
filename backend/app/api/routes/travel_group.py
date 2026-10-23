"""TravelGroup routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.membership import MembershipRead
from app.schemas.travel_group import TravelGroupCreate, TravelGroupRead, TravelGroupUpdate
from app.services import membership as membership_service
from app.services import travel_group as travel_group_service

router = APIRouter(prefix="/travel-groups", tags=["travel-groups"])


def _get_travel_group_or_404(db: Session, travel_group_id: int):
    """Return the travel group or raise a 404."""
    travel_group = travel_group_service.get_travel_group(db, travel_group_id)
    if travel_group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="TravelGroup not found"
        )
    return travel_group


@router.get("", response_model=list[TravelGroupRead])
def list_travel_groups(db: Session = Depends(get_db)) -> list[TravelGroupRead]:
    """List all travel groups."""
    return travel_group_service.list_travel_groups(db)


@router.get("/{travel_group_id}", response_model=TravelGroupRead)
def get_travel_group(travel_group_id: int, db: Session = Depends(get_db)) -> TravelGroupRead:
    """Get a single travel group by id."""
    return _get_travel_group_or_404(db, travel_group_id)


@router.post("", response_model=TravelGroupRead, status_code=status.HTTP_201_CREATED)
def create_travel_group(
    data: TravelGroupCreate, db: Session = Depends(get_db)
) -> TravelGroupRead:
    """Create a new travel group."""
    return travel_group_service.create_travel_group(db, data)


@router.patch("/{travel_group_id}", response_model=TravelGroupRead)
def update_travel_group(
    travel_group_id: int, data: TravelGroupUpdate, db: Session = Depends(get_db)
) -> TravelGroupRead:
    """Update an existing travel group."""
    travel_group = _get_travel_group_or_404(db, travel_group_id)
    return travel_group_service.update_travel_group(db, travel_group, data)


@router.delete("/{travel_group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_travel_group(travel_group_id: int, db: Session = Depends(get_db)) -> None:
    """Delete a travel group."""
    travel_group = _get_travel_group_or_404(db, travel_group_id)
    travel_group_service.delete_travel_group(db, travel_group)


@router.post(
    "/{travel_group_id}/tourists/{tourist_id}",
    response_model=MembershipRead,
    status_code=status.HTTP_201_CREATED,
)
def add_tourist(
    travel_group_id: int, tourist_id: int, db: Session = Depends(get_db)
) -> MembershipRead:
    """Add a tourist to a travel group."""
    _get_travel_group_or_404(db, travel_group_id)
    if membership_service.get_tourist(db, tourist_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tourist not found")
    if membership_service.get_membership(db, travel_group_id, tourist_id) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Tourist already in travel group"
        )
    return membership_service.create_membership(db, travel_group_id, tourist_id)


@router.delete("/{travel_group_id}/tourists/{tourist_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_tourist(travel_group_id: int, tourist_id: int, db: Session = Depends(get_db)) -> None:
    """Remove a tourist from a travel group."""
    membership = membership_service.get_membership(db, travel_group_id, tourist_id)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")
    membership_service.delete_membership(db, membership)
