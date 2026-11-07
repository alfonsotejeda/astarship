"""Attraction schema."""

from pydantic import BaseModel, Field, model_validator

from app.schemas.base import ORMSchema


class AttractionCreate(BaseModel):
    """Fields required to create an attraction."""

    name: str = Field(min_length=1, max_length=255)
    address: str = Field(min_length=1, max_length=255)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class AttractionUpdate(BaseModel):
    """Fields allowed when updating an attraction; none of them can be set to null."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    address: str | None = Field(default=None, min_length=1, max_length=255)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    @model_validator(mode="after")
    def _reject_explicit_null(self) -> "AttractionUpdate":
        """Omit a field to leave it unchanged; sending null for it is an error."""
        for field in self.model_fields_set:
            if getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class AttractionRead(ORMSchema):
    """Attraction fields returned by the API."""

    id: int
    name: str
    address: str
    latitude: float
    longitude: float
