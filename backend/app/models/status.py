"""Lifecycle statuses shared by reviewable entities."""

from enum import StrEnum

from sqlalchemy import Enum


class ReviewStatus(StrEnum):
    """Status of a package or activity, changed by its validations."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ValidationResult(StrEnum):
    """Outcome of an activity validation; it decides the activity's final status."""

    APPROVED = "approved"
    REJECTED = "rejected"


class ItineraryStatus(StrEnum):
    """Status of an itinerary, changed by its validation and approval."""

    PENDING = "pending"
    VALIDATED = "validated"
    APPROVED = "approved"
    REJECTED = "rejected"


class AssignmentStatus(StrEnum):
    """Progress of a tourist through an assigned itinerary."""

    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    FINISHED = "finished"


def status_enum(enum_class: type[StrEnum], name: str = "status") -> Enum:
    """Return a portable column type storing the enum values behind a check constraint.

    Args:
        enum_class: Enum whose values are the allowed column values.
        name: Name of the type, which also names its check constraint.
    """
    return Enum(
        enum_class,
        name=name,
        native_enum=False,
        create_constraint=True,
        length=20,
        values_callable=lambda members: [member.value for member in members],
    )
