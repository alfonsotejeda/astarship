"""Tourist model."""

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.membership import Membership
from app.models.travel_group import TravelGroup

if TYPE_CHECKING:
    from app.models.user.user import User


class Tourist(Base):
    """A user that travels, optionally as part of one or more travel groups."""

    __tablename__ = "tourists"

    id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    age: Mapped[int]

    user: Mapped["User"] = relationship(back_populates="tourist")
    memberships: Mapped[list[Membership]] = relationship(cascade="all, delete-orphan")
    travel_groups: Mapped[list[TravelGroup]] = relationship(secondary="memberships", viewonly=True)
