"""add activity foreign keys

Revision ID: 1571831aa3b3
Revises: a6d2f8c41e93
Create Date: 2026-11-01 14:59:11.748766

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "1571831aa3b3"
down_revision: Union[str, Sequence[str], None] = "a6d2f8c41e93"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # user_id was a plain column: rename it instead of dropping it
    op.alter_column("activities", "user_id", new_column_name="guide_id")

    op.alter_column("activities", "guide_id", existing_type=sa.INTEGER(), nullable=False)
    op.alter_column(
        "activities", "activity_type_code", existing_type=sa.VARCHAR(length=50), nullable=False
    )
    op.alter_column("activities", "category_id", existing_type=sa.INTEGER(), nullable=False)

    op.create_foreign_key(
        op.f("fk_activities_activity_type_code_activity_types"),
        "activities",
        "activity_types",
        ["activity_type_code"],
        ["code"],
        onupdate="CASCADE",
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        op.f("fk_activities_category_id_categories"),
        "activities",
        "categories",
        ["category_id"],
        ["id"],
        onupdate="CASCADE",
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        op.f("fk_activities_guide_id_guides"),
        "activities",
        "guides",
        ["guide_id"],
        ["id"],
        onupdate="CASCADE",
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(op.f("fk_activities_guide_id_guides"), "activities", type_="foreignkey")
    op.drop_constraint(
        op.f("fk_activities_category_id_categories"), "activities", type_="foreignkey"
    )
    op.drop_constraint(
        op.f("fk_activities_activity_type_code_activity_types"), "activities", type_="foreignkey"
    )

    op.alter_column("activities", "category_id", existing_type=sa.INTEGER(), nullable=True)
    op.alter_column(
        "activities", "activity_type_code", existing_type=sa.VARCHAR(length=50), nullable=True
    )
    op.alter_column("activities", "guide_id", existing_type=sa.INTEGER(), nullable=True)

    op.alter_column("activities", "guide_id", new_column_name="user_id")