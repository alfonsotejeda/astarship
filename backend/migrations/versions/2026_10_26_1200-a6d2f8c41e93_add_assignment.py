"""add assignment

Revision ID: a6d2f8c41e93
Revises: d41a7e9c2b58, e7b3c1f9a250, e7b3c5a1f962
Create Date: 2026-10-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a6d2f8c41e93'
down_revision: Union[str, Sequence[str], None] = ('d41a7e9c2b58', 'e7b3c1f9a250', 'e7b3c5a1f962')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ASSIGNMENT_STATUSES = ('assigned', 'in_progress', 'finished')


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('assignments',
    sa.Column('itinerary_id', sa.Integer(), nullable=False),
    sa.Column('tourist_id', sa.Integer(), nullable=False),
    sa.Column('assignment_date', sa.Date(), nullable=False),
    sa.Column(
        'status',
        sa.Enum(
            *ASSIGNMENT_STATUSES,
            name='status', native_enum=False, create_constraint=True, length=20,
        ),
        nullable=False,
    ),
    sa.Column('admin_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(
        ['itinerary_id'], ['itineraries.id'],
        name=op.f('fk_assignments_itinerary_id_itineraries'), ondelete='CASCADE',
    ),
    sa.ForeignKeyConstraint(
        ['tourist_id'], ['tourists.id'],
        name=op.f('fk_assignments_tourist_id_tourists'), ondelete='CASCADE',
    ),
    sa.ForeignKeyConstraint(
        ['admin_id'], ['admins.id'],
        name=op.f('fk_assignments_admin_id_admins'), ondelete='RESTRICT',
    ),
    sa.PrimaryKeyConstraint('itinerary_id', 'tourist_id', name=op.f('pk_assignments'))
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('assignments')
