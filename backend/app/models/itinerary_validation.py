"""Itinerary Validation model."""

from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ItineraryValidation(Base):
    """Review of an itinerary made by a guide before the operations manager approves it."""

    __tablename__ = "itinerary_validations"
    itinerary_id: Mapped[int] = mapped_column(
        ForeignKey("itineraries.id", ondelete="CASCADE"), primary_key=True
    )

    guide_id: Mapped[int] = mapped_column(
        ForeignKey("guides.id", ondelete="CASCADE"), primary_key=True
    )

    validation_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), primary_key=True
    )

    result: Mapped[bool] = mapped_column(Boolean)
    observations: Mapped[str | None] = mapped_column(Text)
