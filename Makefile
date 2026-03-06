.PHONY: help up down build rebuild logs dev dev-hot migrate model-pull ps api-shell web-shell

help:
	@echo "Carrot in a Box - commands"
	@echo "  make up         -> docker compose up --build -d"
	@echo "  make down       -> docker compose down"
	@echo "  make build      -> docker compose build"
	@echo "  make rebuild    -> docker compose build --no-cache web api"
	@echo "  make logs       -> docker compose logs -f --tail=150"
	@echo "  make dev-hot    -> docker dev mode with hot reload"
	@echo "  make migrate    -> alembic upgrade head in api container"
	@echo "  make model-pull -> pull default ollama model"
	@echo "  make ps         -> docker compose ps"
	@echo "  make api-shell  -> shell into api container"
	@echo "  make web-shell  -> shell into web container"

up:
	@echo "[up] starting stack"
	docker compose up --build -d

down:
	@echo "[down] stopping stack"
	docker compose down

build:
	@echo "[build] building images"
	docker compose build

rebuild:
	@echo "[rebuild] no-cache build for web/api"
	docker compose build --no-cache web api

logs:
	docker compose logs -f --tail=150

dev-hot:
	@echo "[dev-hot] starting hot reload stack"
	docker compose -f docker-compose.dev.yml up --build

migrate:
	@echo "[migrate] applying alembic migrations"
	docker compose exec api alembic upgrade head

dev:
	@$(MAKE) dev-hot

model-pull:
	./scripts/pull-model.sh

ps:
	docker compose ps

api-shell:
	docker compose exec api sh

web-shell:
	docker compose exec web sh
