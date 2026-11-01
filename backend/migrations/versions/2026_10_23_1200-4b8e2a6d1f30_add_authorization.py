"""add authorization

Revision ID: 4b8e2a6d1f30
Revises: 7c3d9f2b6e18, 5c1e7a9d2b40
Create Date: 2026-10-23 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4b8e2a6d1f30"
down_revision: Union[str, Sequence[str], None] = ("7c3d9f2b6e18", "5c1e7a9d2b40")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "authorizations",
        sa.Column("guide_id", sa.Integer(), nullable=False),
        sa.Column("package_id", sa.Integer(), nullable=False),
        sa.Column("can_generate", sa.Boolean(), nullable=False),
        sa.Column("can_validate", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(
            ["guide_id"],
            ["guides.id"],
            name=op.f("fk_authorizations_guide_id_guides"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["package_id"],
            ["packages.id"],
            name=op.f("fk_authorizations_package_id_packages"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("guide_id", "package_id", name=op.f("pk_authorizations")),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("authorizations")
