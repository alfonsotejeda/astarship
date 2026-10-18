"""add permission_itineraries table

Revision ID: d626e10a6b0e
Revises: 3a00f2e974ec
Create Date: 2026-10-18 02:00:17.288436

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd626e10a6b0e'
down_revision: Union[str, Sequence[str], None] = '3a00f2e974ec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('permission_itineraries',
    sa.Column('itinerary_id', sa.Integer(), nullable=False),
    sa.Column('permission_name', sa.String(length=255), nullable=False),
    sa.ForeignKeyConstraint(['itinerary_id'], ['itineraries.id'], name=op.f('fk_permission_itineraries_itinerary_id_itineraries')),
    sa.ForeignKeyConstraint(['permission_name'], ['permissions.name'], name=op.f('fk_permission_itineraries_permission_name_permissions')),
    sa.PrimaryKeyConstraint('itinerary_id', 'permission_name', name=op.f('pk_permission_itineraries'))
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('permission_itineraries')