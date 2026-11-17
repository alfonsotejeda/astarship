"""ActivityValidation model."""

from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.status import ValidationResult, status_enum


def _utcnow() -> datetime:
    """Return the current moment as a timezone-aware UTC timestamp."""
    return datetime.now(UTC)


class ActivityValidation(Base):
    """Review of an activity by an admin, used to prevent duplicated activities."""

    __tablename__ = "activity_validations"

    activity_id: Mapped[int] = mapped_column(
        ForeignKey("activities.id", ondelete="CASCADE"), primary_key=True
    )
    admin_id: Mapped[int] = mapped_column(
        ForeignKey("admins.id", ondelete="RESTRICT"), primary_key=True
    )
    validation_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), primary_key=True, default=_utcnow
    )

    result: Mapped[ValidationResult] = mapped_column(status_enum(ValidationResult, name="result"))
    observations: Mapped[str | None] = mapped_column(Text)
