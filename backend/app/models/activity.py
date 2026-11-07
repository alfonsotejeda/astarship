"""Activity model."""

from datetime import date

from sqlalchemy import CheckConstraint, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.activity_validation import ActivityValidation
from app.models.itinerary_composition import ItineraryComposition
from app.models.status import ReviewStatus, status_enum


class Activity(Base):
    """A tourist activity that can be included in an itinerary."""

    __tablename__ = "activities"
    __table_args__ = (
        CheckConstraint("duration >= 1", name="duration_positive"),
        UniqueConstraint("name", "attraction_id", name="uq_activities_name_attraction_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    effort_level: Mapped[int]
    duration: Mapped[int]

    status: Mapped[ReviewStatus] = mapped_column(
        status_enum(ReviewStatus), default=ReviewStatus.PENDING
    )
    creation_date: Mapped[date] = mapped_column(default=date.today)
    activity_type_code: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("activity_types.code", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="RESTRICT", onupdate="CASCADE"), nullable=False
    )
    guide_id: Mapped[int] = mapped_column(
        ForeignKey("guides.id", onupdate="CASCADE", ondelete="RESTRICT"), nullable=False
    )
    attraction_id: Mapped[int] = mapped_column(
        ForeignKey("attractions.id", onupdate="CASCADE", ondelete="RESTRICT")
        
    )

    compositions: Mapped[list[ItineraryComposition]] = relationship(cascade="all, delete-orphan")
    validations: Mapped[list[ActivityValidation]] = relationship(
        cascade="all, delete-orphan"
    )
    category = relationship("Category", back_populates="activities")
    activity_type = relationship("ActivityType", back_populates="activities")
    guide = relationship("Guide", back_populates="activities")
    attraction = relationship("Attraction", back_populates="activities")
