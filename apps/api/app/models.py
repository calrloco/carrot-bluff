from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    handle: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    session_token: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)


class Run(Base):
    __tablename__ = "runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    mode: Mapped[str] = mapped_column(String(16), nullable=False)
    day: Mapped[date | None] = mapped_column(Date, nullable=True)
    model: Mapped[str] = mapped_column(String(128), nullable=False)
    personality: Mapped[str | None] = mapped_column(String(128), nullable=True)
    max_turns: Mapped[int] = mapped_column(Integer, nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    starter: Mapped[str] = mapped_column(String(16), nullable=False)
    final_choice: Mapped[str] = mapped_column(String(16), nullable=False)
    ai_had_carrot: Mapped[bool] = mapped_column(Boolean, nullable=False)
    did_win: Mapped[bool] = mapped_column(Boolean, nullable=False)
    streak: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class LeaderboardDaily(Base):
    __tablename__ = "leaderboards_daily"

    day: Mapped[date] = mapped_column(Date, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    best_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
