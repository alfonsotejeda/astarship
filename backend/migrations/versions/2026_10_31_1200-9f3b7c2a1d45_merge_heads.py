"""merge itinerary fk and modification request heads

Revision ID: 9f3b7c2a1d45
Revises: 9e4a1c7b3d52, c3e9a5f1b724
Create Date: 2026-10-31 12:00:00.000000

"""

from typing import Sequence, Union

revision: str = '9f3b7c2a1d45'
down_revision: Union[str, Sequence[str], None] = ('9e4a1c7b3d52', 'c3e9a5f1b724')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Merge the two heads; both branches already changed their own tables."""


def downgrade() -> None:
    """Unmerge the heads; each branch is downgraded on its own."""
