"""Category schema."""

from pydantic import BaseModel

from app.schemas.base import ORMSchema

class CategoryCreate(BaseModel):
    """Schema for creating a category."""
    name: str

class CategoryUpdate(BaseModel):
    """Schema for updating a category."""
    name: str

class CategoryRead(ORMSchema):
    """Schema for reading a category."""
    id: int
    name: str