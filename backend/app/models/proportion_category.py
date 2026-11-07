"""ProportionCategory model."""

from sqlalchemy import CheckConstraint, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ProportionCategory(Base):
    """Percentage of an itinerary's activities requested for a category."""

    __tablename__ = "proportion_categories"
    __table_args__ = (CheckConstraint("value >= 0 AND value <= 100", name="value_range"),)

    itinerary_id: Mapped[int] = mapped_column(
        ForeignKey("itineraries.id", ondelete="CASCADE"), primary_key=True
    )
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True
    )
    value: Mapped[int]
