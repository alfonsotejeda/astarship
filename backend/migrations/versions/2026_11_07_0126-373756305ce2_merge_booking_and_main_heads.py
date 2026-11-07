"""merge booking and main heads

Revision ID: 373756305ce2
Revises: b7db2baf15d5, 3751c220a240
Create Date: 2026-11-07 01:26:05.426983

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '373756305ce2'
down_revision: Union[str, Sequence[str], None] = ('b7db2baf15d5', '3751c220a240')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
