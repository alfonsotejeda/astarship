"""TravelGroup model."""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.membership import Membership


class TravelGroup(Base):
    """A group of users traveling together."""

    __tablename__ = "travel_groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))

    memberships: Mapped[list[Membership]] = relationship(cascade="all, delete-orphan")
