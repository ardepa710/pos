#!/bin/sh
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Bootstrapping admin user..."
python -c "
import asyncio
from app.database import AsyncSessionLocal
from app.services.user_service import get_or_create_admin
from app.config import settings

async def bootstrap():
    async with AsyncSessionLocal() as session:
        user = await get_or_create_admin(session, settings)
        if user:
            print(f'Admin user ready: {user.username}')

asyncio.run(bootstrap())
"

echo "Starting POS backend..."
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port "${APP_PORT:-8000}" \
    --workers "${WORKERS:-1}" \
    --log-level "${LOG_LEVEL:-info}"
