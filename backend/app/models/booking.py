"""Booking model."""

from datetime import date

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.itinerary import Itinerary
from app.models.package import Package
from app.models.status import BookingStatus, status_enum
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

    status: Mapped[BookingStatus] = mapped_column(
        status_enum(BookingStatus), default=BookingStatus.PENDING
    )
    proposed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    itinerary_id: Mapped[int | None] = mapped_column(
        ForeignKey("itineraries.id", ondelete="SET NULL"), nullable=True
    )
    rejection_reason: Mapped[str | None] = mapped_column(String, nullable=True)

    tourist: Mapped[Tourist] = relationship(back_populates="bookings", passive_deletes=True)
    package: Mapped[Package] = relationship(back_populates="bookings", passive_deletes=True)
    itinerary: Mapped[Itinerary | None] = relationship(back_populates="bookings")
