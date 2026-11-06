"""Visit model."""

from datetime import date
from typing import TYPE_CHECKING
from sqlalchemy import CheckConstraint, ForeignKey, ForeignKeyConstraint, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.assignment import Assignment
    from app.models.itinerary_composition import ItineraryComposition
from app.db.base import Base


class Visit(Base):
    """Record a tourist's visit to an itinerary activity."""

    __tablename__ = "visits"

    itinerary_id: Mapped[int] = mapped_column(primary_key=True)
    tourist_id: Mapped[int] = mapped_column(primary_key=True)
    activity_id: Mapped[int] = mapped_column(primary_key=True)
    comment: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rating: Mapped[int | None] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(String(10))

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
        CheckConstraint("status IN ('pending', 'done', 'cancelled')", name="check_visit_status"),
        CheckConstraint("rating  BETWEEN 1 AND 5", name="check_visit_rating"),
        CheckConstraint(
            "status <> 'done' OR rating IS NOT NULL", name="check_visit_rating_required_if_done"
        ),
    )

    assignment: Mapped["Assignment"] = relationship(
        back_populates="visits",
        overlaps="itinerary_composition",
    )

    itinerary_composition: Mapped["ItineraryComposition"] = relationship(
        back_populates="visits", overlaps="assignment"
    )
