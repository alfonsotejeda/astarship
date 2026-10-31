"""add activity duration

Revision ID: f2a7c4e9b316
Revises: 9e4a1c7b3d52, c3e9a5f1b724
Create Date: 2026-10-31 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f2a7c4e9b316'
down_revision: Union[str, Sequence[str], None] = ('9e4a1c7b3d52', 'c3e9a5f1b724')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'activities', sa.Column('duration', sa.Integer(), server_default='60', nullable=False)
    )
    op.alter_column('activities', 'duration', server_default=None)
    op.create_check_constraint(
        op.f('ck_activities_duration_positive'), 'activities', 'duration >= 1'
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(op.f('ck_activities_duration_positive'), 'activities', type_='check')
    op.drop_column('activities', 'duration')
