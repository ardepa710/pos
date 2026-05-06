# Decisiones de arquitectura — POS

## 2026-05-06

### D001 — Stack seleccionado

FastAPI + PostgreSQL + Next.js 15. Justificación: API-ready para iOS/Android futuro, async nativo, tipado estricto.

### D002 — Multi-divisa

MXN base, USD via Banxico DOF. fx_rate snapshot por venta en `sale_items`. Sin redondeo: NUMERIC(12,4) para tasas.

### D003 — Print Bridge

Daemon host en puerto 9100. Docker no puede acceder USB directo. Tres modos: network TCP / USB via daemon / browser dialog.

### D004 — Licensing

3 modos: none / offline_key (Ed25519) / online_activation (check diario, 7 días gracia). Factory pattern.

### D005 — Consignación

`sale_items.consigned_supplier_id` snapshot en momento de venta para integridad histórica de reportes.

### D006 — Gift Cards

HMAC-SHA256 en `qr_payload`. Balance via `gift_card_transactions` (append-only). Retornos generan GC automáticamente.

### D007 — Terminal reference

`CHECK (method NOT IN ('credit_card','debit_card') OR terminal_reference IS NOT NULL)` en tabla `payments`.

### D008 — tenant_id placeholder

Todas las tablas incluyen `tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'` para v2 multi-sucursal.
