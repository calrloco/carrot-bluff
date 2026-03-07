# Carrot in a Box

Monorepo services:
- `apps/web`: Next.js frontend
- `apps/api`: FastAPI backend with SQLAlchemy + Alembic
- `db`: Postgres
- `ollama`: local LLM runtime

## Game Overview

`Carrot in a Box` is a bluff game between you and the AI:
- There are 2 boxes, but only 1 carrot.
- A scenario is generated (`AI_KNOWS` or `PLAYER_KNOWS`) and a turn limit (3-5).
- You chat/bluff for a few turns.
- Final decision is `keep` or `switch` (by you or AI, depending on scenario).
- Win condition is computed by backend from the final choice and carrot position.

## Environment variables

Backend (`apps/api`):
- `DATABASE_URL` (default `postgresql+psycopg2://postgres:postgres@db:5432/carrot`)
- `OLLAMA_BASE_URL` (default `http://ollama:11434`)
- `OLLAMA_MODEL` (default `qwen2.5:1.5b`)
- `CORS_ORIGINS` (default `http://localhost:3000`)

Frontend (`apps/web`):
- `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000`)

## Run locally with Docker

1. Start stack:
```bash
./scripts/dev.sh
```

2. Pull model (first time):
```bash
./scripts/pull-model.sh
```

3. Open:
- Web: http://localhost:3000
- API docs: http://localhost:8000/docs

## Give More Resources To The Model

1. Increase CPU/RAM available to Docker Desktop (host-level).
2. Increase `ollama` service resources in compose files:
```yaml
ollama:
  cpus: 8
  # optionally also set memory:
  mem_limit: 12g
```
3. Use a larger model (optional):
```bash
OLLAMA_MODEL=qwen2.5:7b ./scripts/dev.sh
./scripts/pull-model.sh qwen2.5:7b
```

Notes:
- Edit both [`docker-compose.yml`](/Users/c/ai/carrot-in-a-box-ai/docker-compose.yml) and [`docker-compose.dev.yml`](/Users/c/ai/carrot-in-a-box-ai/docker-compose.dev.yml) if you use both modes.
- Larger models need more RAM/VRAM and will run slower if resources are insufficient.

## Container Dev Mode (Hot Reload)

Use this when you want `next dev` and `uvicorn --reload` inside containers:

```bash
./scripts/dev-hot.sh
```

Equivalent command:

```bash
docker compose -f docker-compose.dev.yml up --build
```

## Make Commands

Use the root [Makefile](/Users/c/ai/carrot-in-a-box-ai/Makefile):

```bash
make help
make up
make dev-hot
make migrate
make logs
```

## API

- `POST /api/game/start`
- `POST /api/game/turn`
- `POST /api/game/final`
- `GET /api/daily/status?session_token=...`
- `POST /api/session/bootstrap`
- `POST /api/session/handle`
- `GET /api/leaderboard/daily?day=YYYY-MM-DD`
- `GET /api/leaderboard/infinite`
- `GET /health`

## Notes

- Daily mode uses Europe/Rome day seed for deterministic carrot placement.
- Scenario roles are limited to `AI_KNOWS` and `PLAYER_KNOWS`.
- Starter is randomized per scenario (`ai` or `player`).
- Session identity uses a DB token stored client-side (localStorage).
- Turn limit is challenge-driven and randomized in 3..5.
- Backend is source of truth for game state and result logic.
- LLM output is validated as strict JSON (`message`, `intent`, `safety`) with one retry on invalid JSON.
