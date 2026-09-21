#!/usr/bin/env bash
set -e

echo "[BACKEND] Waiting for PostgreSQL database connection..."
python3 -c "
import time
import sys
from app.db.session import engine
from sqlalchemy import text

max_retries = 30
retry_interval = 2

for attempt in range(1, max_retries + 1):
    try:
        with engine.connect() as conn:
            conn.execute(text('SELECT 1'))
        print(f'[BACKEND] Database connection established successfully on attempt {attempt}.')
        sys.exit(0)
    except Exception as exc:
        print(f'[BACKEND] Database not ready yet (attempt {attempt}/{max_retries}): {exc}')
        time.sleep(retry_interval)

print('[BACKEND] Error: Failed to connect to database within timeout.')
sys.exit(1)
"

echo "[BACKEND] Applying Alembic database migrations..."
alembic upgrade head

if [ "${RUN_SEEDS:-false}" = "true" ]; then
    echo "[BACKEND] Running database seed data..."
    python3 -c "from app.db.seeds import run_seeds; run_seeds()" || true
fi

echo "[BACKEND] Starting application server..."
exec "$@"
