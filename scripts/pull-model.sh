#!/usr/bin/env bash
set -euo pipefail

MODEL_NAME="${1:-qwen2.5:1.5b}"

curl -sS http://localhost:11434/api/pull \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"${MODEL_NAME}\"}" \
  | sed -n '1,120p'
