"""Membership model."""

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Membership(Base):
    """Links a tourist with a travel group it belongs to."""

    __tablename__ = "memberships"

    tourist_id: Mapped[int] = mapped_column(
        ForeignKey("tourists.id", ondelete="CASCADE"), primary_key=True
    )
    travel_group_id: Mapped[int] = mapped_column(
        ForeignKey("travel_groups.id", ondelete="CASCADE"), primary_key=True
    )
