"""add itinerary approval

Revision ID: b3e9d2a7c164
Revises: 5fab7354309f
Create Date: 2026-11-02 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b3e9d2a7c164'
down_revision: Union[str, Sequence[str], None] = '5fab7354309f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

APPROVAL_RESULTS = ('approved', 'rejected')


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('itinerary_approvals',
    sa.Column('itinerary_id', sa.Integer(), nullable=False),
    sa.Column('manager_id', sa.Integer(), nullable=False),
    sa.Column('approval_date', sa.DateTime(timezone=True), nullable=False),
    sa.Column(
        'result',
        sa.Enum(
            *APPROVAL_RESULTS,
            name='result', native_enum=False, create_constraint=True, length=20,
        ),
        nullable=False,
    ),
    sa.Column('observations', sa.Text(), nullable=True),
    sa.CheckConstraint(
        "result <> 'rejected' OR observations IS NOT NULL",
        name=op.f('ck_itinerary_approvals_rejection_has_observations'),
    ),
    sa.ForeignKeyConstraint(
        ['itinerary_id'], ['itineraries.id'],
        name=op.f('fk_itinerary_approvals_itinerary_id_itineraries'), ondelete='CASCADE',
    ),
    sa.ForeignKeyConstraint(
        ['manager_id'], ['operations_managers.id'],
        name=op.f('fk_itinerary_approvals_manager_id_operations_managers'), ondelete='CASCADE',
    ),
    sa.PrimaryKeyConstraint(
        'itinerary_id', 'manager_id', 'approval_date', name=op.f('pk_itinerary_approvals')
    )
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('itinerary_approvals')
