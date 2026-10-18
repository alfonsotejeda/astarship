"""Permission - Itinerary relation model."""
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column


from app.db.base import Base

class PermissionItinerary(Base):
    """Association between a permission and an itinerary."""

    __tablename__ = "permission_itineraries"
    itinerary_id: Mapped[int] = mapped_column(ForeignKey("itineraries.id"), primary_key=True)
    permission_name: Mapped[str] = mapped_column( String(255), ForeignKey("permissions.name"), primary_key=True)