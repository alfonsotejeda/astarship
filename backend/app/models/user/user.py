"""User model."""

from enum import StrEnum

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.user.admin import Admin
from app.models.user.guide import Guide
from app.models.user.operations_manager import OperationsManager
from app.models.user.tourist import Tourist


class UserRole(StrEnum):
    """Subtype a user belongs to."""

    ADMIN = "admin"
    GUIDE = "guide"
    OPERATIONS_MANAGER = "operations_manager"
    TOURIST = "tourist"


class User(Base):
    """A registered user of the platform."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))

    admin: Mapped["Admin | None"] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    guide: Mapped["Guide | None"] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    operations_manager: Mapped["OperationsManager | None"] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    tourist: Mapped["Tourist | None"] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def role(self) -> UserRole | None:
        """Return the role given by the subtype row the user has."""
        for role in UserRole:
            if getattr(self, role.value) is not None:
                return role
        return None
