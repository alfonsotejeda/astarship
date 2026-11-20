"""add activity validation

Revision ID: b7e3c9a4d216
Revises: 9e4a1c7b3d52
Create Date: 2026-10-29 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b7e3c9a4d216'
down_revision: Union[str, Sequence[str], None] = '9e4a1c7b3d52'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

VALIDATION_RESULTS = ('approved', 'rejected')


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('activity_validations',
    sa.Column('activity_id', sa.Integer(), nullable=False),
    sa.Column('admin_id', sa.Integer(), nullable=False),
    sa.Column('validation_date', sa.DateTime(timezone=True), nullable=False),
    sa.Column(
        'result',
        sa.Enum(
            *VALIDATION_RESULTS,
            name='result', native_enum=False, create_constraint=True, length=20,
        ),
        nullable=False,
    ),
    sa.Column('observations', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(
        ['activity_id'], ['activities.id'],
        name=op.f('fk_activity_validations_activity_id_activities'), ondelete='CASCADE',
    ),
    sa.ForeignKeyConstraint(
        ['admin_id'], ['admins.id'],
        name=op.f('fk_activity_validations_admin_id_admins'), ondelete='RESTRICT',
    ),
    sa.PrimaryKeyConstraint(
        'activity_id', 'admin_id', 'validation_date', name=op.f('pk_activity_validations')
    )
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('activity_validations')
