"""Booking model."""

from datetime import date

from sqlalchemy import Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.package import Package
from app.models.user.tourist import Tourist


class Booking(Base):
    """Association row linking a tourist to a package they are booked into."""

    __tablename__ = "bookings"

    tourist_id: Mapped[int] = mapped_column(
        ForeignKey("tourists.id", ondelete="CASCADE"), primary_key=True
    )
    package_id: Mapped[int] = mapped_column(
        ForeignKey("packages.id", ondelete="CASCADE"), primary_key=True
    )
    booking_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    tourist: Mapped[Tourist] = relationship(back_populates="bookings", passive_deletes=True)
    package: Mapped[Package] = relationship(back_populates="bookings", passive_deletes=True)
