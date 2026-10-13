"""Package model."""

from sqlalchemy import Boolean, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Package(Base):
    """A tourist package identified by its name and destination."""

    __tablename__ = "packages"
    __table_args__ = (UniqueConstraint("name", "destination"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    destination: Mapped[str] = mapped_column(String(255))
    validated: Mapped[bool] = mapped_column(Boolean, default=False)
