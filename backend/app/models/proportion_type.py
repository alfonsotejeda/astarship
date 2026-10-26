"""ProportionType model."""

from sqlalchemy import CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ProportionType(Base):
    """Percentage of an itinerary's activities requested for an activity type."""

    __tablename__ = "proportion_types"
    __table_args__ = (CheckConstraint("value >= 0 AND value <= 100", name="value_range"),)

    itinerary_id: Mapped[int] = mapped_column(
        ForeignKey("itineraries.id", ondelete="CASCADE"), primary_key=True
    )
    activity_type_code: Mapped[str] = mapped_column(
        String(50), ForeignKey("activity_types.code", ondelete="CASCADE"), primary_key=True
    )
    value: Mapped[int]
