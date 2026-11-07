"""drop permission

Revision ID: 8d4f1b3c7a52
Revises: 4b8e2a6d1f30
Create Date: 2026-10-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '8d4f1b3c7a52'
down_revision: Union[str, Sequence[str], None] = '4b8e2a6d1f30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_table('permissions')


def downgrade() -> None:
    """Downgrade schema."""
    op.create_table('permissions',
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.PrimaryKeyConstraint('name', name=op.f('pk_permissions')),
    sa.UniqueConstraint('name', name=op.f('uq_permissions_name'))
    )
