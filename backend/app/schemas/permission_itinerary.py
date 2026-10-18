"""Permission Itinerary relation schema."""
from pydantic import BaseModel, Field

from app.schemas.base import ORMSchema

class PermissionItineraryCreate(BaseModel):
    """Schema for creating a permission itinerary relation."""
    itinerary_id: int
    permission_name: str = Field(min_length=1, max_length=255)

class PermissionItineraryRead(ORMSchema):
    """Schema for reading a permission itinerary relation."""
    itinerary_id: int
    permission_name: str