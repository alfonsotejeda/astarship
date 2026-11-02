"""add attraction

Revision ID: f2a8c6d4b913
Revises: 9f3b7c2a1d45
Create Date: 2026-11-02 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2a8c6d4b913'
down_revision: Union[str, Sequence[str], None] = '9f3b7c2a1d45'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('attractions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('address', sa.String(length=255), nullable=False),
    sa.Column('latitude', sa.Float(), nullable=False),
    sa.Column('longitude', sa.Float(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_attractions'))
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('attractions')
