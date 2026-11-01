"""add membership

Revision ID: 7c3d9f2b6e18
Revises: 5f2c8e1a9b47
Create Date: 2026-10-22 13:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7c3d9f2b6e18"
down_revision: Union[str, Sequence[str], None] = "5f2c8e1a9b47"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "memberships",
        sa.Column("tourist_id", sa.Integer(), nullable=False),
        sa.Column("travel_group_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["tourist_id"],
            ["tourists.id"],
            name=op.f("fk_memberships_tourist_id_tourists"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["travel_group_id"],
            ["travel_groups.id"],
            name=op.f("fk_memberships_travel_group_id_travel_groups"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("tourist_id", "travel_group_id", name=op.f("pk_memberships")),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("memberships")
