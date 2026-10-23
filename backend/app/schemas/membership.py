"""Membership schema."""

from app.schemas.base import ORMSchema


class MembershipRead(ORMSchema):
    """Membership fields returned by the API."""

    tourist_id: int
    travel_group_id: int
