## Stack

- Runtime backend: Python 3.12 + FastAPI (async)
- ORM: SQLAlchemy 2.0 async + Alembic
- DB: PostgreSQL 16
- Runtime frontend: Node 20 / Next.js 15 App Router (TypeScript strict)
- UI: shadcn/ui + HeroUI + Tailwind v4
- Reverse proxy: Caddy (local Docker)
- Print Bridge: Python FastAPI daemon (puerto 9100, PyInstaller)
- Licensing: Ed25519 offline / online_activation opcional

## Stack Type

- [x] Mixed — Python FastAPI (backend) + Next.js 15 TypeScript (frontend)

## Environment Variables (names only — values in .env)

- DATABASE_URL
- SECRET_KEY
- ALGORITHM
- ACCESS_TOKEN_EXPIRE_MINUTES
- BANXICO_API_KEY
- LICENSE_MODE
- LICENSE_PUBLIC_KEY
- DEMO_MODE
- BUSINESS_NAME
- CORS_ORIGINS
- BACKUP_PATH
- DRIVE_BACKUP_ENABLED

## GitLab Repo

- URL: (pendiente)
- Default branch: development
- Protected branches: main + development

## Current Focus

- Sprint goal: Ola 0 — fundaciones
- Blockers: ninguno
- Recently done: PLAN.md v1.2 congelado, mockups creados
- Next up: Ola 1 — modelos y migraciones

## Version

V2026.05.06-001
