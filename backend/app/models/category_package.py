"""Category Package model."""
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship, backref


from app.db.base import Base

class CategoryPackage(Base):
    """Class category - package relation"""

    __tablename__ = "category_package"
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True)
    package_id: Mapped[int] = mapped_column(ForeignKey("packages.id", ondelete="CASCADE"), primary_key=True)
    category = relationship("Category", backref= backref("category_packages", passive_deletes=True)
)
    package = relationship("Package", backref= backref("package_categories", passive_deletes=True))