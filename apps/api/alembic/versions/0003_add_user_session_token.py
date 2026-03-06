"""add session token to users

Revision ID: 0003_add_user_session_token
Revises: 0002_add_role_starter
Create Date: 2026-03-06 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0003_add_user_session_token"
down_revision: Union[str, Sequence[str], None] = "0002_add_role_starter"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("session_token", sa.String(length=128), nullable=True))
    op.execute(
        """
        UPDATE users
        SET session_token = md5(random()::text || clock_timestamp()::text || id::text)
        WHERE session_token IS NULL
        """
    )
    op.alter_column("users", "session_token", nullable=False)
    op.create_unique_constraint("uq_users_session_token", "users", ["session_token"])


def downgrade() -> None:
    op.drop_constraint("uq_users_session_token", "users", type_="unique")
    op.drop_column("users", "session_token")
