"""Itinerary model."""
from datetime import date

from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Itinerary(Base):
    """A planned sequence of activities for a travel package."""

    __tablename__ = "itineraries"

    id: Mapped[int] = mapped_column(primary_key=True)
    creation_date: Mapped[date]
    activity_count: Mapped[int]
    validated: Mapped[bool]
    package_id: Mapped[int | None]
    creator_id: Mapped[int | None]
