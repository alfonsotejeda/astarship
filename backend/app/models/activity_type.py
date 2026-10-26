"""ActivityType model."""
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.proportion_type import ProportionType


class ActivityType(Base):
    """Describes the type of a tourist activity."""

    __tablename__ = "activity_types"

    code: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))

    proportion_types: Mapped[list[ProportionType]] = relationship(cascade="all, delete-orphan")
