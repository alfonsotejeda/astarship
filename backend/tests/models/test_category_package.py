"""Test Category Package Model"""

from app.models.category_package import CategoryPackage
from app.models.category import Category
from app.models.package import Package


def test_table_name():
    assert CategoryPackage.__tablename__ == "category_package"

def test_column_table():
    colums = {c.name for c in CategoryPackage.__table__.columns}

    assert colums == { "category_id", "package_id"}
