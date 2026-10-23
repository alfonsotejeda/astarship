"""Test Category Package Model"""

from app.models.coverage import Coverage
from app.models.category import Category
from app.models.package import Package


def test_table_name():
    assert Coverage.__tablename__ == "coverage"

def test_column_table():
    colums = {c.name for c in Coverage.__table__.columns}

    assert colums == { "category_id", "package_id"}
