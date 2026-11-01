"""Itinerary model."""

from datetime import date

from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.status import ItineraryStatus, status_enum


class Itinerary(Base):
    """A planned sequence of activities for a travel package."""

    __tablename__ = "itineraries"

    id: Mapped[int] = mapped_column(primary_key=True)
    creation_date: Mapped[date]

    status: Mapped[ItineraryStatus] = mapped_column(
        status_enum(ItineraryStatus), default=ItineraryStatus.PENDING
    )

    activity_count: Mapped[int]
    package_id: Mapped[int | None]
    creator_id: Mapped[int | None]
