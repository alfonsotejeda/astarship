"""Activity model."""
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Activity(Base):
    """A tourist activity that can be included in an itinerary."""

    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    effort_level: Mapped[int]
    activity_type_code: Mapped[str | None] = mapped_column(String(50))
    category_id: Mapped[int | None]
    user_id: Mapped[int | None]
