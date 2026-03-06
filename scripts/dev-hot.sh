#!/usr/bin/env bash
set -euo pipefail

# Containerized dev mode with hot reload for web/api.
docker compose -f docker-compose.dev.yml up --build
