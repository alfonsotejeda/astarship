"""Assignment model."""

from datetime import date

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.modification_request import ModificationRequest
from app.models.status import AssignmentStatus, status_enum


class Assignment(Base):
    """Assigns an itinerary to a tourist, recorded by the admin that made it."""

    __tablename__ = "assignments"

    itinerary_id: Mapped[int] = mapped_column(
        ForeignKey("itineraries.id", ondelete="CASCADE"), primary_key=True
    )
    tourist_id: Mapped[int] = mapped_column(
        ForeignKey("tourists.id", ondelete="CASCADE"), primary_key=True
    )
    assignment_date: Mapped[date] = mapped_column(default=date.today)

    status: Mapped[AssignmentStatus] = mapped_column(
        status_enum(AssignmentStatus), default=AssignmentStatus.ASSIGNED
    )

    admin_id: Mapped[int] = mapped_column(ForeignKey("admins.id", ondelete="RESTRICT"))

    modification_requests: Mapped[list[ModificationRequest]] = relationship(
        cascade="all, delete-orphan"
    )
