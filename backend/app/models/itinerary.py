"""Itinerary model."""
from datetime import date

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.proportion_category import ProportionCategory


class Itinerary(Base):
    """A planned sequence of activities for a travel package."""

    __tablename__ = "itineraries"

    id: Mapped[int] = mapped_column(primary_key=True)
    creation_date: Mapped[date]
    activity_count: Mapped[int]
    validated: Mapped[bool]
    package_id: Mapped[int | None]
    creator_id: Mapped[int | None]

    proportion_categories: Mapped[list[ProportionCategory]] = relationship(
        cascade="all, delete-orphan"
    )
