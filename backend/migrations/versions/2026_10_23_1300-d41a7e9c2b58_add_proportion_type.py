"""add proportion type

Revision ID: d41a7e9c2b58
Revises: 7c3d9f2b6e18
Create Date: 2026-10-23 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd41a7e9c2b58'
down_revision: Union[str, Sequence[str], None] = '7c3d9f2b6e18'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('proportion_types',
    sa.Column('itinerary_id', sa.Integer(), nullable=False),
    sa.Column('activity_type_code', sa.String(length=50), nullable=False),
    sa.Column('value', sa.Integer(), nullable=False),
    sa.CheckConstraint(
        'value >= 0 AND value <= 100', name=op.f('ck_proportion_types_value_range')
    ),
    sa.ForeignKeyConstraint(
        ['itinerary_id'], ['itineraries.id'],
        name=op.f('fk_proportion_types_itinerary_id_itineraries'), ondelete='CASCADE',
    ),
    sa.ForeignKeyConstraint(
        ['activity_type_code'], ['activity_types.code'],
        name=op.f('fk_proportion_types_activity_type_code_activity_types'), ondelete='CASCADE',
    ),
    sa.PrimaryKeyConstraint(
        'itinerary_id', 'activity_type_code', name=op.f('pk_proportion_types')
    )
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('proportion_types')
