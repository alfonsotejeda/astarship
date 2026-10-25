"""add status and creation date

Revision ID: 5c1e7a9d2b40
Revises: 3a00f2e974ec
Create Date: 2026-10-22 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5c1e7a9d2b40'
down_revision: Union[str, Sequence[str], None] = '3a00f2e974ec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

REVIEW_STATUSES = ('pending', 'approved', 'rejected')
ITINERARY_STATUSES = ('pending', 'validated', 'approved', 'rejected')


def _status_column(values: tuple[str, ...]) -> sa.Column:
    return sa.Column(
        'status',
        sa.Enum(*values, name='status', native_enum=False, create_constraint=True, length=20),
        server_default='pending',
        nullable=False,
    )


def _creation_date_column() -> sa.Column:
    return sa.Column(
        'creation_date', sa.Date(), server_default=sa.func.current_date(), nullable=False
    )


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('packages', _status_column(REVIEW_STATUSES))
    op.add_column('packages', _creation_date_column())
    op.execute("UPDATE packages SET status = 'approved' WHERE validated")
    op.drop_column('packages', 'validated')

    op.add_column('activities', _status_column(REVIEW_STATUSES))
    op.add_column('activities', _creation_date_column())

    op.add_column('itineraries', _status_column(ITINERARY_STATUSES))
    op.execute("UPDATE itineraries SET status = 'validated' WHERE validated")
    op.drop_column('itineraries', 'validated')

    for table in ('packages', 'activities', 'itineraries'):
        op.alter_column(table, 'status', server_default=None)
    for table in ('packages', 'activities'):
        op.alter_column(table, 'creation_date', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(
        'itineraries',
        sa.Column('validated', sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.execute("UPDATE itineraries SET validated = status IN ('validated', 'approved')")
    op.alter_column('itineraries', 'validated', server_default=None)
    op.drop_constraint(op.f('ck_itineraries_status'), 'itineraries', type_='check')
    op.drop_column('itineraries', 'status')

    op.drop_constraint(op.f('ck_activities_status'), 'activities', type_='check')
    op.drop_column('activities', 'creation_date')
    op.drop_column('activities', 'status')

    op.add_column(
        'packages',
        sa.Column('validated', sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.execute("UPDATE packages SET validated = status = 'approved'")
    op.alter_column('packages', 'validated', server_default=None)
    op.drop_constraint(op.f('ck_packages_status'), 'packages', type_='check')
    op.drop_column('packages', 'creation_date')
    op.drop_column('packages', 'status')
