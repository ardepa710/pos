# POS — Sistema de Punto de Venta

Sistema POS dockerizado para pequeños comercios en México.
Multi-divisa (MXN/USD), multi-pago, inventario, compras con consignación, tarjetas de regalo, reportes.

## Requisitos

- Docker Desktop 24+
- 4 GB RAM mínimo
- Puerto 80 libre (Caddy)

## Arranque rápido

```bash
cp .env.example .env
# Editar .env con tus valores
docker compose up -d
# Abrir http://localhost (wizard de primer arranque)
```

## Estructura

```
backend/      FastAPI + PostgreSQL
frontend/     Next.js 15 App Router
print-bridge/ Daemon para impresoras USB (host)
license-lib/  Biblioteca Ed25519 de licenciamiento
caddy/        Configuración del reverse proxy
docs/         Guías de usuario + auditorías de seguridad
```

## Documentación

Ver `PLAN.md` para arquitectura completa.

## Versión

V2026.05.06-001
