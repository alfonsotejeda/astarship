"""merge activity validation and main heads

Revision ID: bd6f59ff1f1a
Revises: b7e3c9a4d216, 373756305ce2
Create Date: 2026-11-07 03:31:47.729280

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bd6f59ff1f1a'
down_revision: Union[str, Sequence[str], None] = ('b7e3c9a4d216', '373756305ce2')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
