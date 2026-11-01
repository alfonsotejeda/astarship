"""partition user into admin, guide, operations manager and tourist

Revision ID: 5f2c8e1a9b47
Revises: 3a00f2e974ec
Create Date: 2026-10-22 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "5f2c8e1a9b47"
down_revision: Union[str, Sequence[str], None] = "3a00f2e974ec"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "admins",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["id"], ["users.id"], name=op.f("fk_admins_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_admins")),
    )
    op.create_table(
        "guides",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("specialty", sa.String(length=255), nullable=False),
        sa.ForeignKeyConstraint(
            ["id"], ["users.id"], name=op.f("fk_guides_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_guides")),
    )
    op.create_table(
        "operations_managers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["id"], ["users.id"], name=op.f("fk_operations_managers_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_operations_managers")),
    )
    op.create_table(
        "tourists",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("age", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["id"], ["users.id"], name=op.f("fk_tourists_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_tourists")),
    )

    conn = op.get_bind()
    unmapped = conn.execute(
        sa.text("SELECT count(*) FROM users WHERE role NOT IN ('admin', 'operations_manager')")
    ).scalar()
    if unmapped:
        raise RuntimeError(
            f"{unmapped} users have a role whose subtype needs extra data "
            "(guide: specialty, tourist: age); delete them before upgrading"
        )
    op.execute("INSERT INTO admins (id) SELECT id FROM users WHERE role = 'admin'")
    op.execute(
        "INSERT INTO operations_managers (id) "
        "SELECT id FROM users WHERE role = 'operations_manager'"
    )
    op.drop_column("users", "role")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column("users", sa.Column("role", sa.String(length=50), nullable=True))
    op.execute("UPDATE users SET role = 'admin' WHERE id IN (SELECT id FROM admins)")
    op.execute("UPDATE users SET role = 'guide' WHERE id IN (SELECT id FROM guides)")
    op.execute(
        "UPDATE users SET role = 'operations_manager' "
        "WHERE id IN (SELECT id FROM operations_managers)"
    )
    op.execute("UPDATE users SET role = 'tourist' WHERE id IN (SELECT id FROM tourists)")
    op.alter_column("users", "role", nullable=False)
    op.drop_table("tourists")
    op.drop_table("operations_managers")
    op.drop_table("guides")
    op.drop_table("admins")
