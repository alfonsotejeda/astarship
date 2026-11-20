"""Attraction model."""

from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.activity import Activity


class Attraction(Base):
    """A tourist attraction: a point of the attraction network (the network is not stored)."""

    __tablename__ = "attractions"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    address: Mapped[str] = mapped_column(String(255))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    activities: Mapped[list["Activity"]] = relationship(back_populates="attraction")
