"""OperationsManager model."""

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class OperationsManager(Base):
    """A user that approves itineraries and validates packages."""

    __tablename__ = "operations_managers"

    id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    user = relationship("User", back_populates="operations_manager")
