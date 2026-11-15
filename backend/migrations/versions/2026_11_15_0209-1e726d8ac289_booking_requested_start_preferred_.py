"""booking_requested_start_preferred_resolved

Revision ID: 1e726d8ac289
Revises: bd6f59ff1f1a
Create Date: 2026-11-15 02:09:34.070987

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1e726d8ac289'
down_revision: Union[str, Sequence[str], None] = 'bd6f59ff1f1a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('bookings', 'proposed_date', new_column_name='requested_start_date')
    op.add_column(
        'bookings',
        sa.Column(
            'preferred_itinerary_id',
            sa.Integer(),
            sa.ForeignKey('itineraries.id', ondelete='SET NULL'),
            nullable=True,
        ),
    )
    op.add_column('bookings', sa.Column('resolved_date', sa.Date(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('bookings', 'resolved_date')
    op.drop_column('bookings', 'preferred_itinerary_id')
    op.alter_column('bookings', 'requested_start_date', new_column_name='proposed_date')
