# Carrot in a Box - Dockerized Full Stack

Monorepo services:
- `apps/web`: Next.js frontend
- `apps/api`: FastAPI backend with SQLAlchemy + Alembic
- `db`: Postgres
- `ollama`: local LLM runtime

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

## Container Dev Mode (Hot Reload)

Use this when you want `next dev` and `uvicorn --reload` inside containers:

```bash
./scripts/dev-hot.sh
```

Equivalent command:

```bash
docker compose -f docker-compose.dev.yml up --build
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
