"""Coverage reschema"""

from pydantic import BaseModel

from app.schemas.base import ORMSchema

class CoverageCreate(BaseModel):
    """Coverage Create schema"""

    category_id: int
    package_id: int

class CoverageUpdate(BaseModel):
    """Coverage Update schema"""

    category_id: int
    package_id: int

class CoverageRead(ORMSchema):
    """Coverage Read schema"""

    category_id: int
    package_id: int
