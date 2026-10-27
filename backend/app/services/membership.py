"""Membership service."""

from sqlalchemy.orm import Session

from app.models.membership import Membership


def get_membership(db: Session, travel_group_id: int, tourist_id: int) -> Membership | None:
    """Return the membership of a tourist in a travel group, or None if it doesn't exist."""
    return db.get(Membership, (tourist_id, travel_group_id))


def create_membership(db: Session, travel_group_id: int, tourist_id: int) -> Membership:
    """Add a tourist to a travel group."""
    membership = Membership(tourist_id=tourist_id, travel_group_id=travel_group_id)
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


def delete_membership(db: Session, membership: Membership) -> None:
    """Remove a tourist from a travel group."""
    db.delete(membership)
    db.commit()
