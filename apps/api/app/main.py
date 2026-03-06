from __future__ import annotations

from datetime import date
import secrets
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import and_, desc, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .game_logic import build_share_text, compute_result, new_session, today_rome
from .models import LeaderboardDaily, Run, User
from .ollama import get_llm_json
from .schemas import (
    DailyStatusResponse,
    DailyStatusRun,
    FinalRequest,
    FinalResponse,
    HealthResponse,
    LeaderboardRow,
    SessionBootstrapRequest,
    SessionBootstrapResponse,
    SessionHandleUpdateRequest,
    StartGameRequest,
    StartGameResponse,
    TurnRequest,
    TurnResponse,
)

app = FastAPI(title="Carrot in a Box API")

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ACTIVE_GAMES: dict[str, dict[str, Any]] = {}


def _new_handle(db: Session) -> str:
    for _ in range(8):
        candidate = f"player_{secrets.token_hex(3)}"
        exists = db.execute(select(User).where(User.handle == candidate)).scalar_one_or_none()
        if exists is None:
            return candidate
    raise HTTPException(status_code=500, detail="failed to allocate handle")


async def _ai_turn(game: dict[str, Any], player_message: str | None) -> str:
    session = game["session"]
    transcript = session.transcript
    knowledge = (
        f"You have private truth: AI box has carrot = {session.ai_has_carrot}."
        if session.role == "AI_KNOWS"
        else "You do not know where the carrot is. Reason from player tells and uncertainty."
    )
    prompt = (
        f"Mode: {session.mode}\n"
        f"Scenario role: {session.role}\n"
        f"Starter: {session.starter}\n"
        f"Personality: {session.personality or 'strategic'}\n"
        f"{knowledge}\n"
        f"Turn: {session.turn}/{session.max_turns}\n"
        f"Transcript: {transcript}\n"
        f"Latest player message: {player_message or 'game start'}\n"
        "Craft the next short taunting message (max 180 chars) to influence keep/switch. "
        "Do not mention literal location words, coordinates, or that you can/cannot see the carrot."
    )
    ai_json = await get_llm_json(prompt)
    transcript.append({"role": "ai", "text": ai_json.message})
    return ai_json.message


def _extract_choice(text: str) -> str | None:
    normalized = text.strip().lower()
    if normalized in {"keep", "switch"}:
        return normalized
    if "switch" in normalized:
        return "switch"
    if "keep" in normalized:
        return "keep"
    return None


async def _ai_final_choice(game: dict[str, Any]) -> str:
    session = game["session"]
    prompt = (
        f"Scenario role: {session.role}\n"
        f"Personality: {session.personality or 'strategic'}\n"
        f"Transcript: {session.transcript}\n"
        "Decide final action to maximize your win chance. "
        "Reply JSON with message exactly 'keep' or 'switch'."
    )
    ai_json = await get_llm_json(prompt)
    choice = _extract_choice(ai_json.message)
    return choice or "keep"


@app.post("/api/game/start", response_model=StartGameResponse)
async def start_game(payload: StartGameRequest, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.session_token == payload.session_token)).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="session not found")

    session = new_session(
        user_id=user.id,
        handle=user.handle,
        mode=payload.mode,
    )
    game = {"session": session}
    ACTIVE_GAMES[session.game_id] = game

    if session.starter == "ai":
        ai_message = await _ai_turn(game, None)
    else:
        ai_message = "You start this round. Send your first bluff."
    return StartGameResponse(
        game_id=session.game_id,
        mode=session.mode,
        day=session.day,
        role=session.role,
        starter=session.starter,
        player_box_has_carrot=session.player_box_has_carrot if session.role == "PLAYER_KNOWS" else None,
        turn=session.turn,
        max_turns=session.max_turns,
        ai_message=ai_message,
    )


@app.get("/api/daily/status", response_model=DailyStatusResponse)
def daily_status(session_token: str = Query(..., min_length=16, max_length=128), db: Session = Depends(get_db)):
    today = today_rome()
    user = db.execute(select(User).where(User.session_token == session_token)).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="session not found")

    run = db.execute(
        select(Run)
        .where(Run.user_id == user.id, Run.mode == "daily", Run.day == today)
        .order_by(desc(Run.created_at))
        .limit(1)
    ).scalar_one_or_none()
    if run is None:
        return DailyStatusResponse(day=today, has_played_today=False, handle=user.handle, result=None)

    return DailyStatusResponse(
        day=today,
        has_played_today=True,
        handle=user.handle,
        result=DailyStatusRun(
            did_win=run.did_win,
            streak=run.streak,
            final_choice=run.final_choice,
            share_text=build_share_text("daily", run.did_win, run.streak, today),
        ),
    )


@app.post("/api/session/bootstrap", response_model=SessionBootstrapResponse)
def session_bootstrap(payload: SessionBootstrapRequest, db: Session = Depends(get_db)):
    if payload.session_token:
        user = db.execute(select(User).where(User.session_token == payload.session_token)).scalar_one_or_none()
        if user is not None:
            return SessionBootstrapResponse(session_token=user.session_token, handle=user.handle)

    user = User(handle=_new_handle(db), session_token=secrets.token_hex(24))
    db.add(user)
    db.commit()
    db.refresh(user)
    return SessionBootstrapResponse(session_token=user.session_token, handle=user.handle)


@app.post("/api/session/handle", response_model=SessionBootstrapResponse)
def session_update_handle(payload: SessionHandleUpdateRequest, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.session_token == payload.session_token)).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="session not found")

    exists = db.execute(select(User).where(User.handle == payload.handle, User.id != user.id)).scalar_one_or_none()
    if exists is not None:
        raise HTTPException(status_code=409, detail="handle already in use")

    user.handle = payload.handle
    db.commit()
    db.refresh(user)
    return SessionBootstrapResponse(session_token=user.session_token, handle=user.handle)


@app.post("/api/game/turn", response_model=TurnResponse)
async def game_turn(payload: TurnRequest):
    game = ACTIVE_GAMES.get(payload.game_id)
    if not game:
        raise HTTPException(status_code=404, detail="game not found")

    session = game["session"]
    if session.turn >= session.max_turns:
        raise HTTPException(status_code=400, detail="max turns reached")

    session.turn += 1
    session.transcript.append({"role": "player", "text": payload.player_message.strip()})
    ai_message = await _ai_turn(game, payload.player_message)

    return TurnResponse(
        turn=session.turn,
        max_turns=session.max_turns,
        ai_message=ai_message,
        can_finalize=session.turn >= session.max_turns,
    )


@app.post("/api/game/final", response_model=FinalResponse)
async def game_final(payload: FinalRequest, db: Session = Depends(get_db)):
    game = ACTIVE_GAMES.get(payload.game_id)
    if not game:
        raise HTTPException(status_code=404, detail="game not found")

    session = game["session"]
    if session.role == "PLAYER_KNOWS":
        final_choice = await _ai_final_choice(game)
        decider = "ai"
    else:
        if payload.choice is None:
            raise HTTPException(status_code=400, detail="choice is required in AI_KNOWS mode")
        final_choice = payload.choice
        decider = "player"

    did_win = compute_result(session.ai_has_carrot, final_choice)

    run_filter = [Run.user_id == session.user_id, Run.mode == session.mode]
    if session.mode == "daily":
        run_filter.append(Run.day == session.day)

    previous = db.execute(
        select(Run).where(and_(*run_filter)).order_by(desc(Run.created_at)).limit(1)
    ).scalar_one_or_none()
    streak = (previous.streak + 1) if (previous and did_win) else (1 if did_win else 0)

    run = Run(
        user_id=session.user_id,
        mode=session.mode,
        day=session.day,
        model=session.model,
        personality=session.personality,
        max_turns=session.max_turns,
        role=session.role,
        starter=session.starter,
        final_choice=final_choice,
        ai_had_carrot=session.ai_has_carrot,
        did_win=did_win,
        streak=streak,
    )
    db.add(run)

    if session.mode == "daily" and session.day:
        stmt = insert(LeaderboardDaily).values(day=session.day, user_id=session.user_id, best_streak=streak)
        stmt = stmt.on_conflict_do_update(
            index_elements=[LeaderboardDaily.day, LeaderboardDaily.user_id],
            set_={"best_streak": func.greatest(LeaderboardDaily.best_streak, streak)},
        )
        db.execute(stmt)

    db.commit()
    ACTIVE_GAMES.pop(payload.game_id, None)

    share_text = build_share_text(session.mode, did_win, streak, session.day)
    return FinalResponse(
        did_win=did_win,
        streak=streak,
        role=session.role,
        starter=session.starter,
        decider=decider,
        final_choice=final_choice,
        ai_had_carrot=session.ai_has_carrot,
        share_text=share_text,
    )


@app.get("/api/leaderboard/daily", response_model=list[LeaderboardRow])
def leaderboard_daily(day: str | None = Query(default=None), db: Session = Depends(get_db)):
    if day is None:
        ref_day = today_rome()
    else:
        try:
            ref_day = date.fromisoformat(day)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="day must be YYYY-MM-DD") from exc
    rows = db.execute(
        select(User.handle, LeaderboardDaily.best_streak)
        .join(User, User.id == LeaderboardDaily.user_id)
        .where(LeaderboardDaily.day == ref_day)
        .order_by(desc(LeaderboardDaily.best_streak), User.handle)
        .limit(50)
    ).all()
    return [LeaderboardRow(handle=r[0], best_streak=r[1]) for r in rows]


@app.get("/api/leaderboard/infinite", response_model=list[LeaderboardRow])
def leaderboard_infinite(db: Session = Depends(get_db)):
    rows = db.execute(
        select(User.handle, func.max(Run.streak).label("best_streak"))
        .join(User, User.id == Run.user_id)
        .where(Run.mode == "infinite")
        .group_by(User.handle)
        .order_by(desc(func.max(Run.streak)), User.handle)
        .limit(50)
    ).all()
    return [LeaderboardRow(handle=r[0], best_streak=int(r[1] or 0)) for r in rows]


@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok", model=settings.ollama_model)
