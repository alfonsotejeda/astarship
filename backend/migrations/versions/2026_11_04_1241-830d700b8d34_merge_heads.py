"""merge heads

Revision ID: 830d700b8d34
Revises: f2a7c4e9b316, 1571831aa3b3, f2a8c6d4b913
Create Date: 2026-11-04 12:41:30.052417

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '830d700b8d34'
down_revision: Union[str, Sequence[str], None] = ('f2a7c4e9b316', '1571831aa3b3', 'f2a8c6d4b913')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
