"""merge activity foreign keys and itinerary approval heads

Revision ID: 7b2879d51047
Revises: b3e9d2a7c164, 41d130141606
Create Date: 2026-11-06 20:16:16.138003

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b2879d51047'
down_revision: Union[str, Sequence[str], None] = ('b3e9d2a7c164', '41d130141606')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
