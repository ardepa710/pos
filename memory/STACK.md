## Stack

- Runtime backend: Python 3.12 + FastAPI (async)
- ORM: SQLAlchemy 2.0 async + Alembic (5 migrations: 001001–001005)
- DB: PostgreSQL 16 (NUMERIC(14,4) for money, UUID PKs, pg_trgm)
- Runtime frontend: Node 20 / Next.js 15 App Router (TypeScript strict)
- UI: HeroUI + shadcn/ui + Tailwind v4 + Lucide icons
- State: Zustand (auth + cart), @tanstack/react-query (server state)
- Forms: react-hook-form + zod
- Money precision: decimal.js on frontend
- Jobs: APScheduler (Banxico FX daily at 09:00 MX City)
- Auth: passlib[bcrypt] + python-jose (JWT)
- Reports: reportlab (PDF) + openpyxl (Excel)
- Reverse proxy: Caddy (local Docker, pos-internal network)
- Print Bridge: Python FastAPI daemon (port 9100, PyInstaller — optional)

## Stack Type

- [x] Mixed — Python FastAPI (backend) + Next.js 15 TypeScript (frontend)

## Environment Variables (names only — values in .env)

- DB_PASSWORD
- JWT_SECRET
- DATABASE_URL
- DATABASE_SYNC_URL
- SECRET_KEY
- ALGORITHM
- ACCESS_TOKEN_EXPIRE_MINUTES
- BANXICO_API_KEY
- LICENSE_MODE
- LICENSE_PUBLIC_KEY
- LICENSE_ACTIVATION_SERVER
- DEMO_MODE
- BUSINESS_NAME
- BUSINESS_TYPE
- CORS_ORIGINS
- BACKUP_PATH
- PRINT_BRIDGE_URL
- PRINT_BRIDGE_ENABLED
- TELEMETRY_ENABLED
- TELEMETRY_ENDPOINT
- SUPPORT_WHATSAPP
- ENV
- LOG_LEVEL

## GitLab Repo

- URL: (pendiente)
- Default branch: development
- Protected branches: main + development

## Current Focus

- Sprint goal: QA completo finalizado — sistema 100% operacional
- Blockers: ninguno
- Recently done: QA de todas las features verificado; CloseSessionModal implementado; fix sale_count en reportes; Docker rebuild completo en puerto 3005
- Next up: GitLab repo inicial, primer push a staging (coralslrc.shop), security audit pre-MR

## Version

V2026.05.06-005
