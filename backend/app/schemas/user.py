"""User schema."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.user.user import UserRole
from app.schemas.base import ORMSchema
from app.schemas.travel_group import TravelGroupRead


class UserCreateBase(BaseModel):
    """Fields shared by every role when creating a user."""

    model_config = ConfigDict(extra="forbid")

    name: str
    email: str
    password: str


class AdminCreate(UserCreateBase):
    """Fields required to create an admin."""

    role: Literal[UserRole.ADMIN]


class GuideCreate(UserCreateBase):
    """Fields required to create a guide."""

    role: Literal[UserRole.GUIDE]
    specialty: str


class OperationsManagerCreate(UserCreateBase):
    """Fields required to create an operations manager."""

    role: Literal[UserRole.OPERATIONS_MANAGER]


class TouristCreate(UserCreateBase):
    """Fields required to create a tourist."""

    role: Literal[UserRole.TOURIST]
    age: int


UserCreate = Annotated[
    AdminCreate | GuideCreate | OperationsManagerCreate | TouristCreate,
    Field(discriminator="role"),
]


class GuideUpdate(BaseModel):
    """Guide fields allowed when updating a user."""

    specialty: str | None = None


class TouristUpdate(BaseModel):
    """Tourist fields allowed when updating a user."""

    age: int | None = None


class UserUpdate(BaseModel):
    """Fields allowed when updating a user; the role cannot change."""

    name: str | None = None
    email: str | None = None
    password: str | None = None
    guide: GuideUpdate | None = None
    tourist: TouristUpdate | None = None


class GuideRead(ORMSchema):
    """Guide fields returned by the API."""

    specialty: str


class TouristRead(ORMSchema):
    """Tourist fields returned by the API."""

    age: int
    travel_groups: list[TravelGroupRead]


class UserRead(ORMSchema):
    """User fields returned by the API, with the fields of its subtype."""

    id: int
    name: str
    email: str
    role: UserRole
    guide: GuideRead | None = None
    tourist: TouristRead | None = None
