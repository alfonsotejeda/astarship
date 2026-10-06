"""Pydantic schemas for the API."""

from pydantic import BaseModel, ConfigDict


class ORMSchema(BaseModel):
    """Base schema for API responses built from an ORM model."""

    model_config = ConfigDict(from_attributes=True)
