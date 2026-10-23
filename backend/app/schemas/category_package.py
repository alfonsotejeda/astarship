"""Category Package schema"""

from pydantic import BaseModel

from app.schemas.base import ORMSchema

class CategoryPackageCreate(BaseModel):
    """Category Package Create schema"""

    category_id: int
    package_id: int

class CategoryPackageUpdate(BaseModel):
    """Category Package Update schema"""

    category_id: int
    package_id: int

class CategoryPackageRead(ORMSchema):
    """Category Package Read schema"""

    category_id: int
    package_id: int
