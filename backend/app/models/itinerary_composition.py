"""ItineraryComposition model."""

from datetime import time

from sqlalchemy import CheckConstraint, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ItineraryComposition(Base):
    """Places an activity in an itinerary with its order, day and start time."""

    __tablename__ = "itinerary_compositions"
    __table_args__ = (
        CheckConstraint('"order" >= 1', name="order_positive"),
        CheckConstraint("day >= 1", name="day_positive"),
    )

    itinerary_id: Mapped[int] = mapped_column(
        ForeignKey("itineraries.id", ondelete="CASCADE"), primary_key=True
    )
    activity_id: Mapped[int] = mapped_column(
        ForeignKey("activities.id", ondelete="CASCADE"), primary_key=True
    )
    order: Mapped[int]
    day: Mapped[int]
    start_time: Mapped[time]
