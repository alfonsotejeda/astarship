"""Guide model."""

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.authorization import Authorization


class Guide(Base):
    """A user that creates activities and itineraries."""

    __tablename__ = "guides"

    id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    specialty: Mapped[str] = mapped_column(String(255))

    user = relationship("User", back_populates="guide")
    authorizations: Mapped[list[Authorization]] = relationship(cascade="all, delete-orphan")
