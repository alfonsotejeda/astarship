"""Lifecycle statuses shared by reviewable entities."""

from enum import StrEnum

from sqlalchemy import Enum


class ReviewStatus(StrEnum):
    """Status of a package or activity, changed by its validations."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ItineraryStatus(StrEnum):
    """Status of an itinerary, changed by its validation and approval."""

    PENDING = "pending"
    VALIDATED = "validated"
    APPROVED = "approved"
    REJECTED = "rejected"


class ApprovalResult(StrEnum):
    """Final decision of an operations manager on a validated itinerary."""

    APPROVED = "approved"
    REJECTED = "rejected"


class AssignmentStatus(StrEnum):
    """Progress of a tourist through an assigned itinerary."""

    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    FINISHED = "finished"


class ModificationRequestStatus(StrEnum):
    """Progress of a modification request while a guide handles it."""

    REQUESTED = "requested"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    DENIED = "denied"


class BookingStatus(StrEnum):
    """Lifecycle status of a booking between a tourist and a package."""

    PENDING = "pending"
    ASSIGNED = "assigned"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


def status_enum(enum_class: type[StrEnum], name: str = "status") -> Enum:
    """Return a portable column type storing the enum values behind a check constraint."""
    return Enum(
        enum_class,
        name=name,
        native_enum=False,
        create_constraint=True,
        length=20,
        values_callable=lambda members: [member.value for member in members],
    )
