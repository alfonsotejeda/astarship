"""ModificationRequest model."""

from datetime import datetime

from sqlalchemy import ForeignKey, ForeignKeyConstraint, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.status import ModificationRequestStatus, status_enum


class ModificationRequest(Base):
    """A change a tourist asks for in an assigned itinerary, handled by a guide."""

    __tablename__ = "modification_requests"
    __table_args__ = (
        ForeignKeyConstraint(
            ["itinerary_id", "tourist_id"],
            ["assignments.itinerary_id", "assignments.tourist_id"],
            ondelete="CASCADE",
        ),
    )

    itinerary_id: Mapped[int] = mapped_column(primary_key=True)
    tourist_id: Mapped[int] = mapped_column(primary_key=True)
    guide_id: Mapped[int] = mapped_column(
        ForeignKey("guides.id", ondelete="CASCADE"), primary_key=True
    )
    request_date: Mapped[datetime] = mapped_column(primary_key=True, default=datetime.now)
    description: Mapped[str] = mapped_column(Text)

    status: Mapped[ModificationRequestStatus] = mapped_column(
        status_enum(ModificationRequestStatus), default=ModificationRequestStatus.REQUESTED
    )

    result: Mapped[str | None] = mapped_column(Text)
