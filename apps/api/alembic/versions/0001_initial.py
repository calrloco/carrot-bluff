"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-03-05 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("handle", sa.String(length=64), nullable=False, unique=True),
    )

    op.create_table(
        "runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("mode", sa.String(length=16), nullable=False),
        sa.Column("day", sa.Date(), nullable=True),
        sa.Column("model", sa.String(length=128), nullable=False),
        sa.Column("personality", sa.String(length=128), nullable=True),
        sa.Column("max_turns", sa.Integer(), nullable=False),
        sa.Column("final_choice", sa.String(length=16), nullable=False),
        sa.Column("ai_had_carrot", sa.Boolean(), nullable=False),
        sa.Column("did_win", sa.Boolean(), nullable=False),
        sa.Column("streak", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_runs_user_mode_day_created", "runs", ["user_id", "mode", "day", "created_at"])

    op.create_table(
        "leaderboards_daily",
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("best_streak", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("day", "user_id"),
    )


def downgrade() -> None:
    op.drop_table("leaderboards_daily")
    op.drop_index("ix_runs_user_mode_day_created", table_name="runs")
    op.drop_table("runs")
    op.drop_table("users")
