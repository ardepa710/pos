#!/bin/sh
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting POS backend..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${APP_PORT:-8000}"
