"""OperationsManager model."""

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user.user import User


class OperationsManager(Base):
    """A user that approves itineraries and validates packages."""

    __tablename__ = "operations_managers"

    id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    user: Mapped["User"] = relationship(back_populates="operations_manager")
