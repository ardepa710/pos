# Gotchas — POS

## Docker

- Use `node:20-slim` — never alpine (OpenSSL incompatibility breaks bcrypt/native modules)
- `sslmode=disable` is intentional for internal Docker bridge network (pos-internal).
  Never expose the DB port (5432) externally. sslmode=require on any external connection.
- COMPOSE_PROJECT must be unique per environment on the same host
- Container DNS: use `container_name` (pos-db) in DATABASE_URL, not the compose service name,
  when the container is on multiple networks

## Python / Alembic

- NUMERIC(14,4) for all monetary columns — never FLOAT
- Alembic migrations are linear: 001001→001002→001003→001004→001005.
  down_revision must chain exactly or `alembic upgrade head` will branch-fail.
- `set -e` in entrypoint.sh: migration failure crashes container → Docker restarts → correct behavior
- Deferred FKs: loyalty_accounts→customers and products→suppliers had to be added as
  op.create_foreign_key() in migration 001003 because the referenced tables didn't exist
  in earlier migrations (001001 and 001002 respectively).
- Pydantic v2: use `.model_dump()` not `.dict()`, `model_config = ConfigDict(from_attributes=True)`
- `terminal_reference` is enforced at both DB CHECK constraint and Pydantic `model_validator`:
  card payments (credit/debit) MUST include it; cash/transfer must NOT.

## Next.js

- `output: "standalone"` required in next.config.ts for Docker builds
- `NEXT_PUBLIC_*` must be declared as ARG in the builder stage of Dockerfile
- Tailwind v4 + HeroUI: do not mix HeroUI's `cn` with Tailwind's direct class merge;
  use the local `lib/utils.ts` cn() wrapper
- The `(auth)` route group shares no layout with `(app)` — setup/login/register are public
- `wizard_completed` flag in BusinessSettings drives the app layout redirect to `/setup`

## Security

- JWT stored in Zustand persist (localStorage) — acceptable for desktop-only POS.
  If web-exposed, switch to HTTP-only cookie.
- `terminal_reference` required on card payments at DB and API layers
- Gift card QR codes contain HMAC signature to prevent forgery
- Admin password set via ADMIN_INITIAL_PASSWORD env var; hashed on first boot via entrypoint.sh

## USB Printing

- ESC/POS commands differ between thermal printer brands.
  Print Bridge (port 9100) abstracts this. If PRINT_BRIDGE_ENABLED=false, printing is disabled.
- Print Bridge must run on the HOST machine (not inside Docker) to access USB devices.
  Set PRINT_BRIDGE_URL=http://host-gateway:9100 on Linux or http://host.docker.internal:9100 on Windows/Mac.

## Banxico FX

- APScheduler job fetches MXN/USD rate daily at 09:00 Mexico City time.
- BANXICO_API_KEY must be set or the job silently skips (no crash).
- Rate stored in exchange_rates table; fallback to last known rate on API failure.

## Multi-branch v2

- All tables have tenant_id column with placeholder '00000000-0000-0000-0000-000000000001'::uuid
- This is the hook for future multi-branch support — do not remove or repurpose

## Docker boot sequence (hard-won fixes — 2026-05-06)

- **alembic/env.py must use sync engine**: `engine_from_config` + `pool.NullPool`, NOT `async_engine_from_config`.
  Even though the app uses asyncpg, alembic runs synchronously. `async_engine_from_config` with a
  `postgresql://` URL crashes with "asyncio extension requires async driver".
- **asyncpg rejects `sslmode=disable`**: That param belongs to psycopg2. For internal Docker networks,
  just omit SSL entirely: `postgresql+asyncpg://user:pass@host:5432/db` (no query params).
  DATABASE_SYNC_URL (psycopg2) can keep `postgresql://...` without sslmode since internal too.
- **bcrypt 4.x breaks passlib**: `passlib[bcrypt]>=1.7.4` pulls bcrypt 4.x which raises
  `ValueError: password cannot be longer than 72 bytes` in passlib's wrap-bug detection routine.
  Pin: `bcrypt>=3.2.0,<4.0.0` in pyproject.toml.
- **pydantic-settings list[str] needs JSON format**: `CORS_ORIGINS=url1,url2` fails.
  Must be `CORS_ORIGINS='["url1","url2"]'` (JSON array string) in docker-compose.yml env section.
- **uvicorn --log-level requires lowercase**: `LOG_LEVEL=INFO` crashes uvicorn. Normalize in
  entrypoint.sh: `LOG_LEVEL_LOWER=$(echo "${LOG_LEVEL:-info}" | tr '[:upper:]' '[:lower:]')`.
- **pydantic EmailStr requires `pydantic[email]`**: Just `pydantic>=2.7.0` is not enough.
  Must be `pydantic[email]>=2.7.0` in pyproject.toml.
- **entrypoint.sh admin bootstrap**: pass `settings.admin_initial_password` (str), not `settings`
  (the whole Settings object) to `get_or_create_admin()`.
- **api.ts import type must include all types used in signatures**: After refactoring api.ts to
  re-export from types/index.ts, only importing `UUID, ISODate, Decimal` was not enough — every
  type used in function return signatures (`UserRead`, `ProductRead`, etc.) must also be in the
  `import type { ... }` statement, not just the `export type { ... }` re-export block.

## Next.js Standalone Build Hot-Patching (2026-05-06)

- **Source files don't exist in the container**: The frontend runs as a pre-compiled Next.js standalone
  build. Editing `frontend/src/**` has zero effect until the image is rebuilt. For in-container fixes,
  patch the compiled JS chunk directly.
- **Hot-patch workflow**:
  1. Find the chunk: `docker exec pos-frontend find /app/.next/static/chunks -name "*.js" | grep pos`
  2. `docker cp pos-frontend:/app/.next/static/chunks/app/.../page-HASH.js ./chunk.js`
  3. Edit with PowerShell `$content.Replace()` — MUST call `Set-Content ... -Encoding UTF8 -NoNewline`
     explicitly to persist. Assigning to `$content` in memory without Set-Content → silently lost.
  4. Verify patches with `$content -match 'pattern'` before saving.
  5. `docker cp ./chunk.js pos-frontend:/app/.next/static/chunks/app/.../page-HASH.js`
  6. Hard reload browser (Ctrl+Shift+R) — normal navigation serves cached chunk.
- **Minified variable names change with every build**: After rebuild, re-identify variable mapping by
  searching for known strings (e.g. `closeSession`, `close_session`, `Cerrar`) in the new chunk.
- **report_service.py `get_sales_by_period`**: Returns field `"sale_count"` (was `"count"` in original).
  Frontend ReportsPage expects `sale_count`. Mismatched key causes silent `undefined.toLocaleString` crash.
