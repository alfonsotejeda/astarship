"""Permission model."""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Permission(Base):
    """A permission that can be granted to users."""

    __tablename__ = "permissions"
    name: Mapped[str] = mapped_column(String(255), unique=True, primary_key=True)
