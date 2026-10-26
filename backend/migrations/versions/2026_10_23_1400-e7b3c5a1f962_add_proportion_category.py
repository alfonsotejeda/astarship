"""add proportion category

Revision ID: e7b3c5a1f962
Revises: 7c3d9f2b6e18
Create Date: 2026-10-23 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e7b3c5a1f962'
down_revision: Union[str, Sequence[str], None] = '7c3d9f2b6e18'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('proportion_categories',
    sa.Column('itinerary_id', sa.Integer(), nullable=False),
    sa.Column('category_id', sa.Integer(), nullable=False),
    sa.Column('value', sa.Integer(), nullable=False),
    sa.CheckConstraint(
        'value >= 0 AND value <= 100', name=op.f('ck_proportion_categories_value_range')
    ),
    sa.ForeignKeyConstraint(
        ['itinerary_id'], ['itineraries.id'],
        name=op.f('fk_proportion_categories_itinerary_id_itineraries'), ondelete='CASCADE',
    ),
    sa.ForeignKeyConstraint(
        ['category_id'], ['categories.id'],
        name=op.f('fk_proportion_categories_category_id_categories'), ondelete='CASCADE',
    ),
    sa.PrimaryKeyConstraint(
        'itinerary_id', 'category_id', name=op.f('pk_proportion_categories')
    )
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('proportion_categories')
