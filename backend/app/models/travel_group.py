"""TravelGroup model."""
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TravelGroup(Base):
    """A group of users traveling together."""

    __tablename__ = "travel_groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
