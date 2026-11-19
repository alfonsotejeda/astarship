"""Add visits.

Revision ID: d4e5f6a7b8c9
Revises: bd6f59ff1f1a
Create Date: 2026-11-17 12:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "bd6f59ff1f1a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the visits table."""
    op.create_table(
        "visits",
        sa.Column("itinerary_id", sa.Integer(), nullable=False),
        sa.Column("tourist_id", sa.Integer(), nullable=False),
        sa.Column("activity_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("comment", sa.String(length=255), nullable=True),
        sa.CheckConstraint("rating BETWEEN 1 AND 5", name=op.f("ck_visits_check_visit_rating")),
        sa.CheckConstraint(
            "status <> 'done' OR rating IS NOT NULL",
            name=op.f("ck_visits_check_visit_rating_required_if_done"),
        ),
        sa.CheckConstraint("status IN ('done', 'skipped')", name=op.f("ck_visits_visit_status")),
        sa.ForeignKeyConstraint(
            ["itinerary_id", "activity_id"],
            ["itinerary_compositions.itinerary_id", "itinerary_compositions.activity_id"],
            name=op.f("fk_visits_itinerary_id_itinerary_compositions"),
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["itinerary_id", "tourist_id"],
            ["assignments.itinerary_id", "assignments.tourist_id"],
            name=op.f("fk_visits_itinerary_id_assignments"),
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "itinerary_id", "tourist_id", "activity_id", name=op.f("pk_visits")
        ),
    )


def downgrade() -> None:
    """Drop the visits table."""
    op.drop_table("visits")
