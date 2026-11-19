"""PackageValidation model."""

from datetime import UTC, datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.status import ValidationResult, status_enum
from app.models.user.operations_manager import OperationsManager


def _utcnow() -> datetime:
    """Return the current moment as a timezone-aware UTC timestamp."""
    return datetime.now(UTC)


class PackageValidation(Base):
    """Review of a package by an operations manager."""

    __tablename__ = "package_validations"
    __table_args__ = (
        CheckConstraint(
            "(result <> 'rejected') OR (observations IS NOT NULL)",
            name="ck_package_validations_observations_not_null_when_rejected",
        ),
    )

    package_id: Mapped[int] = mapped_column(
        ForeignKey("packages.id", ondelete="CASCADE"), primary_key=True
    )
    manager_id: Mapped[int] = mapped_column(
        ForeignKey("operations_managers.id", ondelete="RESTRICT"), primary_key=True
    )
    validation_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), primary_key=True, default=_utcnow
    )

    result: Mapped[ValidationResult] = mapped_column(status_enum(ValidationResult, name="result"))
    observations: Mapped[str | None] = mapped_column(Text)

    manager: Mapped[OperationsManager] = relationship(OperationsManager)
