"""Guide model."""

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user.user import User


class Guide(Base):
    """A user that creates activities and itineraries."""

    __tablename__ = "guides"

    id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    specialty: Mapped[str] = mapped_column(String(255))

    user: Mapped["User"] = relationship(back_populates="guide")
