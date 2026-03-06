from __future__ import annotations

import hashlib
import random
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime
from zoneinfo import ZoneInfo

from .config import settings

ROME_TZ = ZoneInfo("Europe/Rome")
PERSONALITIES = ["cold", "chaotic", "calm", "aggressive", "trickster"]


@dataclass
class GameSession:
    game_id: str
    user_id: uuid.UUID
    handle: str
    mode: str
    day: date | None
    model: str
    personality: str | None
    max_turns: int
    turn: int
    role: str
    starter: str
    ai_has_carrot: bool
    player_box_has_carrot: bool
    transcript: list[dict[str, str]] = field(default_factory=list)


def today_rome() -> date:
    return datetime.now(tz=ROME_TZ).date()


def build_seed(day: date) -> int:
    digest = hashlib.sha256(day.isoformat().encode("utf-8")).hexdigest()
    return int(digest[:12], 16)


def new_session(user_id: uuid.UUID, handle: str, mode: str) -> GameSession:
    day = today_rome() if mode == "daily" else None
    if day is not None:
        rng = random.Random(build_seed(day))
    else:
        rng = random.Random()

    role = "AI_KNOWS" if rng.randint(0, 1) == 0 else "PLAYER_KNOWS"
    starter = "ai" if rng.randint(0, 1) == 0 else "player"
    player_box_has_carrot = bool(rng.randint(0, 1))
    max_turns = rng.randint(3, 5)
    personality = rng.choice(PERSONALITIES)

    return GameSession(
        game_id=str(uuid.uuid4()),
        user_id=user_id,
        handle=handle,
        mode=mode,
        day=day,
        model=settings.ollama_model,
        personality=personality,
        max_turns=max_turns,
        turn=0,
        role=role,
        starter=starter,
        ai_has_carrot=not player_box_has_carrot,
        player_box_has_carrot=player_box_has_carrot,
    )


def compute_result(ai_has_carrot: bool, choice: str) -> bool:
    if choice == "keep":
        return not ai_has_carrot
    return ai_has_carrot


def build_share_text(mode: str, did_win: bool, streak: int, day: date | None) -> str:
    tag = "DAILY" if mode == "daily" else "INFINITE"
    status = "WIN" if did_win else "LOSS"
    day_txt = f" {day.isoformat()}" if day else ""
    return f"Carrot in a Box [{tag}{day_txt}] {status} | streak {streak}"
