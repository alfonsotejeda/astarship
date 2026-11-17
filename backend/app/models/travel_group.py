"""TravelGroup model."""
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.membership import Membership


class TravelGroup(Base):
    """A group of users traveling together, attended by a guide."""

    __tablename__ = "travel_groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    guide_id: Mapped[int] = mapped_column(ForeignKey("guides.id", ondelete="RESTRICT"))

    memberships: Mapped[list[Membership]] = relationship(cascade="all, delete-orphan")
