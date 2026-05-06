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
