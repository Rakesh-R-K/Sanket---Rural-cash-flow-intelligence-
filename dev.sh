#!/usr/bin/env bash
# One-command dev runner for the demo. Backend on :8000, PWA on :5173.
# Everything runs on localhost — the demo needs no internet.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "▶ Seeding pristine demo state…"
( cd "$ROOT/api" && .venv/bin/python -m app.seed )

echo "▶ Starting API (:8000) and PWA (:5173). Ctrl-C to stop both."
( cd "$ROOT/api" && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 ) &
API_PID=$!
( cd "$ROOT/app" && npm run dev -- --host ) &
APP_PID=$!
trap "kill $API_PID $APP_PID 2>/dev/null" EXIT
wait
