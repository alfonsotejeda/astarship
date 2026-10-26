"""add itinerary composition

Revision ID: e7b3c1f9a250
Revises: 7c3d9f2b6e18
Create Date: 2026-10-23 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e7b3c1f9a250'
down_revision: Union[str, Sequence[str], None] = '7c3d9f2b6e18'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('itinerary_compositions',
    sa.Column('itinerary_id', sa.Integer(), nullable=False),
    sa.Column('activity_id', sa.Integer(), nullable=False),
    sa.Column('order', sa.Integer(), nullable=False),
    sa.Column('day', sa.Integer(), nullable=False),
    sa.Column('start_time', sa.Time(), nullable=False),
    sa.CheckConstraint(
        '"order" >= 1', name=op.f('ck_itinerary_compositions_order_positive')
    ),
    sa.CheckConstraint('day >= 1', name=op.f('ck_itinerary_compositions_day_positive')),
    sa.ForeignKeyConstraint(
        ['itinerary_id'], ['itineraries.id'],
        name=op.f('fk_itinerary_compositions_itinerary_id_itineraries'), ondelete='CASCADE',
    ),
    sa.ForeignKeyConstraint(
        ['activity_id'], ['activities.id'],
        name=op.f('fk_itinerary_compositions_activity_id_activities'), ondelete='CASCADE',
    ),
    sa.PrimaryKeyConstraint(
        'itinerary_id', 'activity_id', name=op.f('pk_itinerary_compositions')
    )
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('itinerary_compositions')
