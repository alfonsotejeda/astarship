"""Category Package model."""
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship


from app.db.base import Base

class CategoryPackage(Base):
    """Class category - package relation"""

    __tablename__ = "category_package"
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True)
    package_id: Mapped[int] = mapped_column(ForeignKey("packages.id", ondelete="CASCADE"), primary_key=True)
    category = relationship("Category", backref= "category_packages")
    package = relationship("Package", backref= "package_categories")