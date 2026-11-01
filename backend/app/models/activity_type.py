"""ActivityType model."""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ActivityType(Base):
    """Describes the type of a tourist activity."""

    __tablename__ = "activity_types"

    code: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
