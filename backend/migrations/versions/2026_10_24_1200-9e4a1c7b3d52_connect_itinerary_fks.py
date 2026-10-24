"""connect itinerary fks

Revision ID: 9e4a1c7b3d52
Revises: 4b8e2a6d1f30
Create Date: 2026-10-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '9e4a1c7b3d52'
down_revision: Union[str, Sequence[str], None] = '4b8e2a6d1f30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('itineraries', 'creator_id', new_column_name='guide_id')
    op.execute(
        "DELETE FROM itineraries"
        " WHERE package_id IS NULL OR guide_id IS NULL"
        " OR package_id NOT IN (SELECT id FROM packages)"
        " OR guide_id NOT IN (SELECT id FROM guides)"
    )
    op.alter_column('itineraries', 'package_id', existing_type=sa.Integer(), nullable=False)
    op.alter_column('itineraries', 'guide_id', existing_type=sa.Integer(), nullable=False)
    op.create_foreign_key(
        op.f('fk_itineraries_package_id_packages'),
        'itineraries', 'packages', ['package_id'], ['id'], ondelete='CASCADE',
    )
    op.create_foreign_key(
        op.f('fk_itineraries_guide_id_guides'),
        'itineraries', 'guides', ['guide_id'], ['id'], ondelete='RESTRICT',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(op.f('fk_itineraries_guide_id_guides'), 'itineraries', type_='foreignkey')
    op.drop_constraint(
        op.f('fk_itineraries_package_id_packages'), 'itineraries', type_='foreignkey'
    )
    op.alter_column('itineraries', 'guide_id', existing_type=sa.Integer(), nullable=True)
    op.alter_column('itineraries', 'package_id', existing_type=sa.Integer(), nullable=True)
    op.alter_column('itineraries', 'guide_id', new_column_name='creator_id')
