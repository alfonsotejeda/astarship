"""Authorization model."""

from sqlalchemy import Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Authorization(Base):
    """Grants a guide the right to generate or validate itineraries of a package."""

    __tablename__ = "authorizations"

    guide_id: Mapped[int] = mapped_column(
        ForeignKey("guides.id", ondelete="CASCADE"), primary_key=True
    )
    
    package_id: Mapped[int] = mapped_column(
        ForeignKey("packages.id", ondelete="CASCADE"), primary_key=True
    )
    
    can_generate: Mapped[bool] = mapped_column(Boolean, default=False)
    can_validate: Mapped[bool] = mapped_column(Boolean, default=False)
