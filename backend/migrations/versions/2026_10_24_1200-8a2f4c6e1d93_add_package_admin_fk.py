"""add package admin fk

Revision ID: 8a2f4c6e1d93
Revises: 4b8e2a6d1f30
Create Date: 2026-10-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '8a2f4c6e1d93'
down_revision: Union[str, Sequence[str], None] = '4b8e2a6d1f30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('packages', sa.Column('admin_id', sa.Integer(), nullable=True))
    # Existing packages are assigned to the oldest admin; fails if there are packages but no admins.
    op.execute("UPDATE packages SET admin_id = (SELECT MIN(id) FROM admins)")
    op.alter_column('packages', 'admin_id', nullable=False)
    op.create_foreign_key(
        op.f('fk_packages_admin_id_admins'), 'packages', 'admins', ['admin_id'], ['id']
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(op.f('fk_packages_admin_id_admins'), 'packages', type_='foreignkey')
    op.drop_column('packages', 'admin_id')
