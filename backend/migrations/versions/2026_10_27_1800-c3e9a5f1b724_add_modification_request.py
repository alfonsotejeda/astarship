"""add modification request

Revision ID: c3e9a5f1b724
Revises: 4b8e2d7f1a63
Create Date: 2026-10-27 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3e9a5f1b724'
down_revision: Union[str, Sequence[str], None] = '4b8e2d7f1a63'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

MODIFICATION_REQUEST_STATUSES = ('requested', 'in_progress', 'resolved', 'denied')


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('modification_requests',
    sa.Column('itinerary_id', sa.Integer(), nullable=False),
    sa.Column('tourist_id', sa.Integer(), nullable=False),
    sa.Column('guide_id', sa.Integer(), nullable=False),
    sa.Column('request_date', sa.DateTime(), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column(
        'status',
        sa.Enum(
            *MODIFICATION_REQUEST_STATUSES,
            name='status', native_enum=False, create_constraint=True, length=20,
        ),
        nullable=False,
    ),
    sa.Column('result', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(
        ['itinerary_id', 'tourist_id'], ['assignments.itinerary_id', 'assignments.tourist_id'],
        name=op.f('fk_modification_requests_itinerary_id_assignments'), ondelete='CASCADE',
    ),
    sa.ForeignKeyConstraint(
        ['guide_id'], ['guides.id'],
        name=op.f('fk_modification_requests_guide_id_guides'), ondelete='CASCADE',
    ),
    sa.PrimaryKeyConstraint(
        'itinerary_id', 'tourist_id', 'guide_id', 'request_date',
        name=op.f('pk_modification_requests'),
    )
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('modification_requests')
