from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator


Mode = Literal["daily", "infinite"]
Choice = Literal["keep", "switch"]
Intent = Literal["probe", "bluff", "decide", "other"]
ScenarioRole = Literal["AI_KNOWS", "PLAYER_KNOWS"]
Starter = Literal["ai", "player"]


class SessionBootstrapRequest(BaseModel):
    session_token: str | None = None


class SessionBootstrapResponse(BaseModel):
    session_token: str
    handle: str


class SessionHandleUpdateRequest(BaseModel):
    session_token: str = Field(min_length=16, max_length=128)
    handle: str = Field(min_length=3, max_length=32)

    @field_validator("handle")
    @classmethod
    def normalize_handle(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if not cleaned.replace("_", "").isalnum():
            raise ValueError("handle must be alphanumeric or underscore")
        return cleaned


class StartGameRequest(BaseModel):
    mode: Mode
    session_token: str = Field(min_length=16, max_length=128)


class TurnRequest(BaseModel):
    game_id: str
    player_message: str = Field(min_length=1, max_length=600)


class FinalRequest(BaseModel):
    game_id: str
    choice: Choice | None = None


class AIResponse(BaseModel):
    message: str
    intent: Intent
    safety: str


class StartGameResponse(BaseModel):
    game_id: str
    mode: Mode
    day: date | None
    role: ScenarioRole
    starter: Starter
    player_box_has_carrot: bool | None
    turn: int
    max_turns: int
    ai_message: str


class TurnResponse(BaseModel):
    turn: int
    max_turns: int
    ai_message: str
    can_finalize: bool


class FinalResponse(BaseModel):
    did_win: bool
    streak: int
    role: ScenarioRole
    starter: Starter
    decider: Starter
    final_choice: Choice
    ai_had_carrot: bool
    share_text: str


class LeaderboardRow(BaseModel):
    handle: str
    best_streak: int


class HealthResponse(BaseModel):
    status: str
    model: str


class DailyStatusRun(BaseModel):
    did_win: bool
    streak: int
    final_choice: Choice
    share_text: str


class DailyStatusResponse(BaseModel):
    day: date
    has_played_today: bool
    handle: str
    result: DailyStatusRun | None = None
