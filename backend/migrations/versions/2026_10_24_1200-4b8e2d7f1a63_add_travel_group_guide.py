"""add guide to travel group (Attends)

Merges the status and partition branches, which both started from 3a00f2e974ec.

Revision ID: 4b8e2d7f1a63
Revises: 5c1e7a9d2b40, 7c3d9f2b6e18
Create Date: 2026-10-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '4b8e2d7f1a63'
down_revision: Union[str, Sequence[str], None] = ('5c1e7a9d2b40', '7c3d9f2b6e18')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    existing = conn.execute(sa.text("SELECT count(*) FROM travel_groups")).scalar()
    if existing:
        raise RuntimeError(
            f"{existing} travel groups have no guide to attend them; "
            "delete them before upgrading"
        )
    op.add_column('travel_groups', sa.Column('guide_id', sa.Integer(), nullable=False))
    op.create_foreign_key(
        op.f('fk_travel_groups_guide_id_guides'), 'travel_groups', 'guides',
        ['guide_id'], ['id'], ondelete='RESTRICT',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        op.f('fk_travel_groups_guide_id_guides'), 'travel_groups', type_='foreignkey'
    )
    op.drop_column('travel_groups', 'guide_id')
