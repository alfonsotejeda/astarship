"""Admin model."""

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user.user import User


class Admin(Base):
    """A user that administers packages, activities and assignments."""

    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    user: Mapped["User"] = relationship(back_populates="admin")
