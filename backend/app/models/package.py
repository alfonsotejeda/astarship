"""Package model."""

from datetime import date

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.authorization import Authorization
from app.models.status import ReviewStatus, status_enum


class Package(Base):
    """A tourist package identified by its name and destination."""

    __tablename__ = "packages"
    __table_args__ = (UniqueConstraint("name", "destination"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    destination: Mapped[str] = mapped_column(String(255))
    creation_date: Mapped[date] = mapped_column(default=date.today)
    admin_id: Mapped[int] = mapped_column(ForeignKey("admins.id"))
    
    status: Mapped[ReviewStatus] = mapped_column(
        status_enum(ReviewStatus), default=ReviewStatus.PENDING
    )
    authorizations: Mapped[list[Authorization]] = relationship(cascade="all, delete-orphan")
    admin = relationship("Admin", back_populates="packages")
