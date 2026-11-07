"""ItineraryApproval model."""

from datetime import UTC, datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.status import ApprovalResult, status_enum


class ItineraryApproval(Base):
    """Final decision of an operations manager on an itinerary validated by a guide."""

    __tablename__ = "itinerary_approvals"
    __table_args__ = (
        CheckConstraint(
            "result <> 'rejected' OR observations IS NOT NULL",
            name="rejection_has_observations",
        ),
    )

    itinerary_id: Mapped[int] = mapped_column(
        ForeignKey("itineraries.id", ondelete="CASCADE"), primary_key=True
    )
    manager_id: Mapped[int] = mapped_column(
        ForeignKey("operations_managers.id", ondelete="CASCADE"), primary_key=True
    )
    approval_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), primary_key=True
    )

    result: Mapped[ApprovalResult] = mapped_column(status_enum(ApprovalResult, name="result"))
    observations: Mapped[str | None] = mapped_column(Text)
