"""Tourist model."""

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.assignment import Assignment
from app.models.membership import Membership
from app.models.travel_group import TravelGroup


class Tourist(Base):
    """A user that travels, optionally as part of one or more travel groups."""

    __tablename__ = "tourists"

    id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    age: Mapped[int]

    user = relationship("User", back_populates="tourist")
    memberships: Mapped[list[Membership]] = relationship(cascade="all, delete-orphan")
    travel_groups: Mapped[list[TravelGroup]] = relationship(secondary="memberships", viewonly=True)
    assignments: Mapped[list[Assignment]] = relationship(cascade="all, delete-orphan")
