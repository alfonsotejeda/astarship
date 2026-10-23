"""Category model."""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.proportion_category import ProportionCategory


class Category(Base):
    """A category that groups tourist activities."""

    __tablename__ = "categories"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

    proportion_categories: Mapped[list[ProportionCategory]] = relationship(
        cascade="all, delete-orphan"
    )
