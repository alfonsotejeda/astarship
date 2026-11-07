"""merge coverage and main heads

Revision ID: 3751c220a240
Revises: e43f11ba56b2, 7b2879d51047
Create Date: 2026-11-07 00:15:50.711931

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3751c220a240'
down_revision: Union[str, Sequence[str], None] = ('e43f11ba56b2', '7b2879d51047')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
