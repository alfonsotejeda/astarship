"""merge main and assignment date

Revision ID: 8f08100a15e6
Revises: bd6f59ff1f1a, 5afa7dc20b17
Create Date: 2026-11-20 19:24:57.560649

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f08100a15e6'
down_revision: Union[str, Sequence[str], None] = ('bd6f59ff1f1a', '5afa7dc20b17')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
