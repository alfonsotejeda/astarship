"""add assignment date to primary key

Revision ID: 2302904d66b0
Revises: a6d2f8c41e93
Create Date: 2026-11-17 11:51:38.177487

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2302904d66b0'
down_revision: Union[str, Sequence[str], None] = 'c3e9a5f1b724'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(
        op.f('fk_modification_requests_itinerary_id_assignments'),
        'modification_requests',
        type_='foreignkey',
    )
    op.drop_constraint(op.f('pk_assignments'), 'assignments', type_='primary')
    op.create_primary_key(
        op.f('pk_assignments'),
        'assignments',
        ['itinerary_id', 'tourist_id', 'assignment_date'],
    )


def downgrade() -> None:
    op.drop_constraint(op.f('pk_assignments'), 'assignments', type_='primary')
    op.create_primary_key(op.f('pk_assignments'), 'assignments', ['itinerary_id', 'tourist_id'])
    op.create_foreign_key(
        op.f('fk_modification_requests_itinerary_id_assignments'),
        'modification_requests',
        'assignments',
        ['itinerary_id', 'tourist_id'],
        ['itinerary_id', 'tourist_id'],
        ondelete='CASCADE',
    )