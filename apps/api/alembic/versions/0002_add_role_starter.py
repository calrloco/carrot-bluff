"""add role and starter to runs

Revision ID: 0002_add_role_starter
Revises: 0001_initial
Create Date: 2026-03-06 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0002_add_role_starter"
down_revision: Union[str, Sequence[str], None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("runs", sa.Column("role", sa.String(length=16), nullable=True))
    op.add_column("runs", sa.Column("starter", sa.String(length=16), nullable=True))

    op.execute("UPDATE runs SET role = 'AI_KNOWS' WHERE role IS NULL")
    op.execute("UPDATE runs SET starter = 'ai' WHERE starter IS NULL")

    op.alter_column("runs", "role", nullable=False)
    op.alter_column("runs", "starter", nullable=False)


def downgrade() -> None:
    op.drop_column("runs", "starter")
    op.drop_column("runs", "role")
