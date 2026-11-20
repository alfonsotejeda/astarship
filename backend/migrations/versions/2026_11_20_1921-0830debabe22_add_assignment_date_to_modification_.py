"""add assignment date to modification requests

Revision ID: 0830debabe22
Revises: 2302904d66b0
Create Date: 2026-11-20 19:21:46.314817

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0830debabe22'
down_revision: Union[str, Sequence[str], None] = '2302904d66b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'modification_requests', sa.Column('assignment_date', sa.Date(), nullable=True)
    )
    op.execute(
        """
        UPDATE modification_requests mr
        SET assignment_date = (
            SELECT MIN(a.assignment_date)
            FROM assignments a
            WHERE a.itinerary_id = mr.itinerary_id AND a.tourist_id = mr.tourist_id
        )
        """
    )
    op.alter_column('modification_requests', 'assignment_date', nullable=False)
    op.drop_constraint(
        op.f('pk_modification_requests'), 'modification_requests', type_='primary'
    )
    op.create_primary_key(
        op.f('pk_modification_requests'),
        'modification_requests',
        ['itinerary_id', 'tourist_id', 'assignment_date', 'guide_id', 'request_date'],
    )
    op.create_foreign_key(
        op.f('fk_modification_requests_itinerary_id_assignments'),
        'modification_requests',
        'assignments',
        ['itinerary_id', 'tourist_id', 'assignment_date'],
        ['itinerary_id', 'tourist_id', 'assignment_date'],
        ondelete='CASCADE',
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f('fk_modification_requests_itinerary_id_assignments'),
        'modification_requests',
        type_='foreignkey',
    )
    op.drop_constraint(
        op.f('pk_modification_requests'), 'modification_requests', type_='primary'
    )
    op.create_primary_key(
        op.f('pk_modification_requests'),
        'modification_requests',
        ['itinerary_id', 'tourist_id', 'guide_id', 'request_date'],
    )
    op.drop_column('modification_requests', 'assignment_date')