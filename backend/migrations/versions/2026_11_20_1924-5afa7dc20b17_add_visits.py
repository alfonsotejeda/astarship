"""add visits

Revision ID: 5afa7dc20b17
Revises: 0830debabe22
Create Date: 2026-11-20 19:24:08.080741

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5afa7dc20b17'
down_revision: Union[str, Sequence[str], None] = '0830debabe22'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'visits',
        sa.Column('itinerary_id', sa.Integer(), nullable=False),
        sa.Column('tourist_id', sa.Integer(), nullable=False),
        sa.Column('assignment_date', sa.Date(), nullable=False),
        sa.Column('activity_id', sa.Integer(), nullable=False),
        sa.Column('comment', sa.String(length=255), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=10), nullable=False),
        sa.CheckConstraint(
            "status <> 'done' OR rating IS NOT NULL",
            name=op.f('ck_visits_check_visit_rating_required_if_done'),
        ),
        sa.CheckConstraint(
            "status IN ('done', 'skipped')", name=op.f('ck_visits_check_visit_status')
        ),
        sa.CheckConstraint('rating BETWEEN 1 AND 5', name=op.f('ck_visits_check_visit_rating')),
        sa.ForeignKeyConstraint(
            ['itinerary_id', 'activity_id'],
            ['itinerary_compositions.itinerary_id', 'itinerary_compositions.activity_id'],
            name=op.f('fk_visits_itinerary_id_itinerary_compositions'),
            onupdate='CASCADE',
            ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(
            ['itinerary_id', 'tourist_id', 'assignment_date'],
            ['assignments.itinerary_id', 'assignments.tourist_id', 'assignments.assignment_date'],
            name=op.f('fk_visits_itinerary_id_assignments'),
            onupdate='CASCADE',
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint(
            'itinerary_id', 'tourist_id', 'assignment_date', 'activity_id',
            name=op.f('pk_visits'),
        ),
    )


def downgrade() -> None:
    op.drop_table('visits')