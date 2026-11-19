"""add package validation

Revision ID: a3f5c8e2d1b4
Revises: bd6f59ff1f1a
Create Date: 2026-11-13 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3f5c8e2d1b4'
down_revision: Union[str, Sequence[str], None] = 'bd6f59ff1f1a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

VALIDATION_RESULTS = ('approved', 'rejected')


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('package_validations',
    sa.Column('package_id', sa.Integer(), nullable=False),
    sa.Column('manager_id', sa.Integer(), nullable=False),
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
    sa.CheckConstraint(
        "(result <> 'rejected') OR (observations IS NOT NULL)",
        name=op.f('ck_package_validations_observations_not_null_when_rejected'),
    ),
    sa.ForeignKeyConstraint(
        ['package_id'], ['packages.id'],
        name=op.f('fk_package_validations_package_id_packages'), ondelete='CASCADE',
    ),
    sa.ForeignKeyConstraint(
        ['manager_id'], ['operations_managers.id'],
        name=op.f('fk_package_validations_manager_id_operations_managers'), ondelete='RESTRICT',
    ),
    sa.PrimaryKeyConstraint(
        'package_id', 'manager_id', 'validation_date', name=op.f('pk_package_validations')
    )
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('package_validations')
