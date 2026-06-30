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

### D009 — SQLAlchemy 2.0 session pattern

`get_session` gestiona la transacción completa: `async with session.begin(): yield session`.
No llamar `session.begin()` ni `session.commit()` en routers/services — el context manager lo hace.
Usar `session.flush()` + `session.refresh()` dentro de servicios para leer `server_default` post-INSERT.

### D010 — CloseSessionModal UI

`salesApi.closeSession` existía desde Ola 2 pero sin UI. Se creó `CloseSessionModal.tsx` separado
(patrón consistente con `OpenSessionModal`). `POSTerminal` gestiona el estado `showCloseSession`
y el callback `handleSessionClosed` que resetea `session = null` para volver al flujo de apertura.

## 2026-06-29 — Auditoría de seguridad + rediseño UI

### D011 — Integridad de dinero con row locks

Todo flujo que lee-verifica-escribe dinero/stock usa `SELECT … FOR UPDATE` (`with_for_update()`)
dentro de la misma transacción: redención de gift card y decremento de `product.stock_quantity`.
Sin el lock hay carreras (doble-redención, oversell). La venta DEBE debitar la gift card
(`redeem_gift_card_by_id`) — antes solo sumaba el monto sin tocar el saldo (bug CRÍTICO).
Devoluciones: precio SIEMPRE del `SaleItem` original (server-side) + tope acumulado sumando
`ReturnItem` previos. Nunca confiar montos/precios del request del cliente.

### D012 — RBAC autoritativo en el backend

El RBAC del frontend (Sidebar/layout filtran por rol) es SOLO UX — bypasseable con un token vía API.
Toda regla de rol se gatea en el backend: writes de suppliers/customers → `SupervisorUser`,
reports → dependency a nivel router, y ownership-check en `GET /sales/sessions/{id}` (IDOR).
Audit logs en mutaciones sensibles (sesión de caja, customer/supplier).

### D013 — Estrategia de color: "vibrante con significado"

Evolución de "sobrio" (olivo ≤10%) a vibrante: olivo = **voz de acción** (CTA/activo/foco/serie
principal); el resto del color viene de una **paleta categórica/semántica** asignada de forma
estable por hash (`lib/vendor-color.ts`) para charts, puntos de vendedor, halos de empty-state y KPIs.
El color se gana su lugar por significado (identidad/estado/data viz), no por decoración.
DESIGN.md actualizado en consecuencia.

### D014 — Charts y paneles: librerías

`recharts@^3` themeado por **CSS-vars** en `fill`/`stroke` (sigue light/dark automáticamente) +
`chart-kit.tsx` (tooltip on-theme, formateador de pesos). `react-resizable-panels@^2` (NO v4: v4
renombra a `Group/Panel/Separator` y quita `autoSaveId`/persistencia automática) para los paneles
resizeables del POS. Componentes de reporte/chart deben ser `"use client"`.

### D015 — Dashboard en `/dashboard`, landing por rol

El dashboard NO va en `/`: existe `src/app/page.tsx` (raíz) que hace `redirect("/login")` y eclipsa
cualquier `(app)/page.tsx`. El dashboard vive en `(app)/dashboard/page.tsx` (dentro del app shell).
Login enruta por rol: admin/supervisor → `/dashboard`, cajero → `/pos` (su flujo, y no puede leer
los datos de reportes que muestra el dashboard).

### D016 — Accesibilidad: meta AA real

Meta WCAG **AA**, no AAA/HIG. Touch target mínimo = 24px (SC 2.5.8) — usamos 40px como término
medio cómodo, no 44px. Componentes deshabilitados están EXENTOS del contraste mínimo (SC 1.4.3).
`focus-visible` (outline olivo 2px) obligatorio en todo control. Motion siempre con
`@media (prefers-reduced-motion: reduce)`. Color semántico nunca es el único portador (ícono/texto).

### D017 — Tests contra Postgres real

Los modelos usan tipos Postgres (`UUID`, `JSONB`, `::uuid` server_default) → SQLite no sirve.
`conftest` crea el esquema una vez de forma SÍNCRONA (psycopg2) + un engine async POR TEST
(evita el bug de binding de event-loop de asyncpg con pytest-asyncio). Servicios solo `flush()`
(sin commit) → rollback por test aísla; datos cross-sesión (API/concurrencia) usan commits con keys únicas.
