"""Visit model."""

from sqlalchemy import CheckConstraint, ForeignKeyConstraint, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.status import VisitStatus, status_enum


class Visit(Base):
    """Record of a tourist's visit to an activity of an assigned itinerary."""

    __tablename__ = "visits"
    __table_args__ = (
        ForeignKeyConstraint(
            ["itinerary_id", "tourist_id"],
            ["assignments.itinerary_id", "assignments.tourist_id"],
            ondelete="CASCADE",
            onupdate="CASCADE",
        ),
        ForeignKeyConstraint(
            ["itinerary_id", "activity_id"],
            ["itinerary_compositions.itinerary_id", "itinerary_compositions.activity_id"],
            ondelete="CASCADE",
            onupdate="CASCADE",
        ),
        CheckConstraint("rating BETWEEN 1 AND 5", name="check_visit_rating"),
        CheckConstraint(
            "status <> 'done' OR rating IS NOT NULL",
            name="check_visit_rating_required_if_done",
        ),
    )

    itinerary_id: Mapped[int] = mapped_column(primary_key=True)
    tourist_id: Mapped[int] = mapped_column(primary_key=True)
    activity_id: Mapped[int] = mapped_column(primary_key=True)
    status: Mapped[VisitStatus] = mapped_column(status_enum(VisitStatus, name="visit_status"))
    rating: Mapped[int | None] = mapped_column(nullable=True)
    comment: Mapped[str | None] = mapped_column(String(255), nullable=True)
