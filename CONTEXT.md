## Session 2026-05-06 — Ola 0 arranque del proyecto

**Goal:** Crear fundaciones completas del proyecto POS (meta + skills + scaffolding)
**Affected files:** todos los archivos nuevos (directorio vacío al inicio)
**Key decisions:** Ver memory/DECISIONS.md D001-D008
**Skills activated:** subagent-driven-development, writing-plans, executing-plans
**Env changes:** .env.example creado con todas las variables
**DB changes:** ninguna aún (Ola 1)
**Blockers:** ninguno
**Version bump:** V2026.05.06-001
**Status on close:** complete

[ARCHIVED]

---

## Session 2026-05-06 — Olas 1–5 completas: sistema POS operacional

**Goal:** Ejecutar todas las olas del plan v1.2 congelado — modelos, API, UI, integración
**Affected files:** 60+ archivos (backend models/schemas/routers/services, frontend pages/components/store)
**Key decisions:**

- sslmode=disable es excepción documentada para red Docker interna (pos-internal bridge); nunca exponer puerto 5432
- tenant_id placeholder `'00000000-0000-0000-0000-000000000001'::uuid` en todas las tablas como hook para multi-branch v2
- terminal_reference requerido en pagos con tarjeta: DB CHECK constraint + Pydantic model_validator
- decimal.js en frontend para toda aritmética monetaria (evita float drift)
- Zustand persist store para auth (token + user); cart store sin persistencia
- wizard_completed en BusinessSettings controla redirect a /setup en app layout
- NUMERIC(14,4) para dinero (más precisión que 12,2 original del plan)
- Alembic migrations lineales encadenadas 001001→001005 con deferred FKs en 001003

**Skills activated:** subagent-driven-development, fastapi, sqlalchemy, alembic, nextjs, react-best-practices, pydantic

**Env changes:**

- .env.example reescrito: DB_PASSWORD + JWT_SECRET como vars de nivel superior
- Añadidos: PRINT_BRIDGE_URL, PRINT_BRIDGE_ENABLED, TELEMETRY_ENABLED, SUPPORT_WHATSAPP
- sslmode=disable documentado con nota de red interna Docker

**DB changes:**

- 001001: users, business_settings, audit_logs, cashier_sessions, loyalty_accounts, loyalty_transactions
- 001002: categories, products, stock_movements
- 001003: customers, suppliers (+ deferred FKs para loyalty→customer y product→supplier)
- 001004: purchases, purchase_items, consignment_settlements, sales, sale_items, payments
- 001005: gift_cards, gift_card_transactions, returns, return_items, exchange_rates

**Fixes aplicados (post-agentes):**

- backend/app/models/**init**.py: Purchase/Sale/Payment models faltaban de Ola 1
- backend/app/main.py: 4 routers sin cablear después de Ola 2 (auth, users, purchases, extras)
- frontend/src/components/settings/UsersManager.tsx: agente A4 truncó — creado directamente
- frontend/src/components/settings/AppearanceSettings.tsx: agente A4 truncó — creado directamente
- frontend/src/lib/api.ts: purchasesApi.settle + consignmentIn + listConsignments faltaban
- frontend/src/lib/api.ts: settingsApi.completeWizard añadido en Ola 5
- frontend/src/lib/api.ts: BusinessSettings interface extendida (support_whatsapp, theme, wizard_completed)
- backend/entrypoint.sh: bootstrap admin user añadido después de alembic upgrade head

**Blockers:** ninguno
**Version bump:** V2026.05.06-001
**Status on close:** complete — sistema listo para `docker compose up -d`

[ARCHIVED]

---

## Session 2026-05-06 — Docker deploy + TypeScript fix + backend boot fixes

**Goal:** Levantar el sistema completo en Docker en el puerto 3005 y corregir todos los errores de compilación

**Affected files:**

- `frontend/src/lib/api.ts`
- `frontend/src/types/index.ts`
- `frontend/src/components/returns/ReturnForm.tsx`
- `frontend/src/components/suppliers/SuppliersManager.tsx`
- `frontend/src/components/purchases/PurchaseDetail.tsx`
- `frontend/src/components/pos/ProductGrid.tsx`
- `backend/alembic/env.py`
- `backend/app/config.py`
- `backend/entrypoint.sh`
- `backend/pyproject.toml`
- `docker-compose.yml`
- `.env`

**Key decisions:**

- `api.ts` re-exporta todos los tipos desde `types/index.ts` (single source of truth); el `import type` debe incluir todos los tipos usados en firmas de funciones, no solo los primitivos
- `alembic/env.py` usa `engine_from_config` (sync psycopg2) — alembic no necesita async; `async_engine_from_config` con URL `postgresql://` falla con "asyncio extension requires async driver"
- `CORS_ORIGINS` en pydantic-settings v2 requiere formato JSON array: `'["url1","url2"]'` — la notación `url1,url2` no funciona con `list[str]`
- `asyncpg` no acepta `sslmode=disable` en la URL — ese parámetro es de psycopg2; para red interna Docker simplemente se omite
- `passlib[bcrypt]` es incompatible con `bcrypt>=4.0` — pinado a `bcrypt>=3.2.0,<4.0.0`
- `ADMIN_INITIAL_PASSWORD` faltaba en `config.py`; `entrypoint.sh` pasaba el objeto `settings` completo a `hash_password()` en vez de `settings.admin_initial_password`
- uvicorn requiere `--log-level` en minúsculas; `LOG_LEVEL=INFO` se convierte con `tr '[:upper:]' '[:lower:]'` en entrypoint.sh
- `pydantic[email]` (con el extra) es necesario para campos `EmailStr`

**Skills activated:** docker, fastapi, pydantic, systematic-debugging

**Env changes:**

- `.env` y `docker-compose.yml`: `sslmode=disable` eliminado de ambas URLs de DB
- `docker-compose.yml`: `CORS_ORIGINS` en formato JSON array

**DB changes:** ninguna — migraciones ya existentes corrieron exitosamente

**Blockers:** ninguno

**Version bump:** V2026.05.06-002

**Status on close:** complete — todos los contenedores corriendo en http://localhost:3005

[ARCHIVED]

---

## Session 2026-05-06 — QA en vivo: corrección de bugs de transacción SQLAlchemy + Docker

**Goal:** Corregir bugs reportados durante QA funcional del sistema corriendo en Docker local (sin rebuild — hot-patch vía docker cp)

**Affected files:**

- `backend/app/database.py`
- `backend/app/routers/sales.py`
- `backend/app/routers/extras.py`
- `backend/app/routers/auth.py`
- `backend/app/services/cashier_session_service.py`
- `backend/app/services/sale_service.py`
- `backend/app/services/return_service.py`
- `backend/app/services/settings_service.py`
- `backend/app/services/catalog_service.py`
- `backend/app/services/purchase_service.py`
- `backend/app/services/user_service.py`
- `docker-compose.yml`
- `frontend/src/app/(auth)/setup/page.tsx`

**Key decisions:**

- **SQLAlchemy 2.0 autobegin=True**: el patrón correcto es que `get_session` gestione la transacción completa con `async with session.begin(): yield session`. Todos los `session.begin()` en routers/services son redundantes y causan `InvalidRequestError: A transaction is already begun`. Eliminados de sales.py (2), extras.py (3), sale_service.py (2), return_service.py (1).
- **session.commit() → session.flush()**: los services usaban `session.commit()` manualmente; con el nuevo patrón el commit lo hace el context manager de `get_session` al salir. Reemplazado en todos los services (19 ocurrencias en 5 archivos).
- **session.refresh() post-flush**: necesario para leer valores `server_default` (created_at, updated_at, tenant_id) después de un INSERT. Añadido en cashier_session_service open_session y close_session.
- **Volúmenes Docker doble prefijo**: `name: pos` + volumen `pos_pgdata` → Docker crea `pos_pos_pgdata`. Fix: renombrar volúmenes internos a `pgdata`, `backups`, `caddydata`, `caddyconfig` → resultado final `pos_pgdata`, etc. Migración de datos con `docker run alpine cp -a`.
- **Hot-patch workflow**: sin rebuild de imagen, los fixes de Python se aplican con `docker cp <file> pos-backend:/app/app/...` seguido de `docker restart pos-backend`. El writable layer del contenedor persiste a través de restart (no recreate).
- **Setup wizard redirect loop**: `router.replace("/pos")` hace navegación client-side con layout que tiene `wizard_completed: false` cacheado → bounce de vuelta a /setup. Fix: `window.location.replace("/pos")` fuerza full reload con datos frescos del servidor.
- **Setup wizard dropdown dark theme**: native `<select>` usa estilo del OS (fondo blanco). Reemplazado con grid 3 columnas de `<button>` con estilos CSS variables del tema oscuro + `setValue("business_type", key)` de react-hook-form.

**Skills activated:** systematic-debugging, fastapi, sqlalchemy, docker

**Env changes:** ninguna nueva

**DB changes:** ninguna de schema. Datos: PROD-001 y PROD-002 creados durante QA (pueden borrarse o quedar como fixtures de prueba).

**Blockers:** ninguno — backend estable con todos los fixes hot-patched

**Pendiente para rebuild final (frontend — no aplicable con docker cp):**

- Setup wizard: dropdown → grid de botones (staged en source)
- Setup wizard: `window.location.replace` en vez de `router.replace` (staged en source)

**Version bump:** V2026.05.06-003

**Status on close:** in-progress — QA continúa; rebuild Docker pendiente al terminar QA completo

[ARCHIVED]

---

## Session 2026-05-06 — QA Ola 2: POS layout fix + Docker rebuild final

**Goal:** Corregir layout incorrecto de la pantalla de ventas POS y ejecutar rebuild completo de Docker con todos los cambios acumulados

**Affected files:**

- `frontend/src/components/pos/POSTerminal.tsx`
- `frontend/src/components/layout/AppShell.tsx`
- `frontend/src/app/(app)/pos/page.tsx`

**Key decisions:**

- **POS layout 2 columnas**: El diseño 3 columnas horizontales (40/30/30) es incorrecto para POS. Reemplazado por 2 columnas: catálogo (55%) a la izquierda, y carrito + panel de pago apilados verticalmente (45%) a la derecha. Carrito ocupa `flex: 0 0 38%`, panel de pago ocupa `flex: 1`.
- **`w-full` en POSTerminal**: El contenedor principal del terminal carecía de `w-full`, haciendo que los porcentajes de columnas se calcularan sobre un ancho indeterminado.
- **`h-full` chain en AppShell**: `main` en AppShell necesita `min-height: 0` y `display: flex; flex-direction: column` para que `h-full` funcione en hijos del POSPage. Sin esto, Next.js standalone no encadena la altura correctamente.
- **POSPage height**: Cambiado de `h-[calc(100vh-3.5rem)]` (incorrecto en desktop — la topbar no existe) a `h-full w-full`.
- **Docker rebuild ejecutado**: Todos los cambios frontend staged + todos los backend fixes hot-patched quedan en la imagen final. `docker compose up -d --build --force-recreate` exitoso. Los warnings de volúmenes (`already exists but was not created by Docker Compose`) son cosméticos — los datos están íntegros.

**Skills activated:** docker, react-best-practices, frontend-design

**Env changes:** ninguna

**DB changes:** ninguna

**Blockers:** ninguno

**Version bump:** V2026.05.06-004

**Status on close:** in-progress — rebuild completado, QA continúa

[ARCHIVED]

---

## Session 2026-05-06 — QA completo: Cerrar sesión de caja + fixes de reportes y devoluciones

**Goal:** Completar QA funcional de todas las features del sistema POS; implementar UI faltante para cerrar sesión de caja

**Affected files:**

- `frontend/src/components/pos/CloseSessionModal.tsx` (CREADO)
- `frontend/src/components/pos/POSTerminal.tsx`
- `backend/app/services/report_service.py`

**Key decisions:**

- **`CloseSessionModal`**: Nuevo componente modal que muestra resumen de sesión (efectivo inicial, total ventas), input de efectivo físico al cierre, y llama a `salesApi.closeSession(token, amount.toFixed(2))`. Al éxito invoca `onSessionClosed()` que setea `session = null` en `POSTerminal`.
- **"Cerrar caja" button**: Añadido en sección izquierda del terminal, visible solo cuando hay sesión activa, con estilo hover rojo (usa `var(--error)`).
- **`get_sales_by_period` field fix**: El backend retornaba `"count"` pero el frontend esperaba `"sale_count"`. Fix: renombrar campo en `report_service.py` línea ~221.
- **Hot-patch workflow para standalone build**: El frontend corre como Next.js standalone compilado en Docker — no existe código fuente en el contenedor. Los patches se aplican con: `docker cp` chunk out → editar JS minificado con PowerShell `$content.Replace()` → `Set-Content` explícito → `docker cp` de vuelta → hard reload (Ctrl+Shift+R) en browser. CRÍTICO: `Set-Content` debe llamarse explícitamente — asignar a `$content` en memoria sin guardar produce silently lost patches.
- **Minified variable mapping** del chunk `page-0e735b1dfb9dd393.js`: `G`=POSTerminal, `P`=OpenSessionModal, `K`=ReceiptModal, `Z`=CloseSessionModal (añadida), `j`=session, `g`=setSession, `ee`/`te`=showCloseSession state, `ne`=handleSessionClosed.

**Skills activated:** react-best-practices, nextjs, systematic-debugging, docker

**Env changes:** ninguna

**DB changes:** ninguna

**QA completo — todas las features verificadas:**

| Feature                | Resultado                                  |
| ---------------------- | ------------------------------------------ |
| Ventas / POS terminal  | ✅                                         |
| Productos / Categorías | ✅                                         |
| Clientes / Proveedores | ✅                                         |
| Compras                | ✅                                         |
| Tarjetas de regalo     | ✅                                         |
| Devoluciones           | ✅ (fix 422 en sesión anterior)            |
| Reportes (5 tabs)      | ✅ (fix `sale_count` esta sesión)          |
| Configuración (3 tabs) | ✅                                         |
| Cerrar sesión de caja  | ✅ (implementado y verificado esta sesión) |

**Blockers:** ninguno

**Version bump:** V2026.05.06-005

**Status on close:** complete — QA 100% terminado, sistema operacional

[ARCHIVED]

---

## Session 2026-05-07 — Settings UI fix + make-interfaces-feel-better pass

**Goal:** (1) Corregir theme toggle, color principal y logo URL que no se aplicaban al DOM. (2) Pasar `/make-interfaces-feel-better` en todas las páginas y componentes UI.

**Affected files:**

- `frontend/src/app/(app)/layout.tsx` — efectos useEffect para aplicar theme y primary_color al `<html>`
- `frontend/src/components/providers/Providers.tsx` — eliminado themeClass incorrecto (aplicaba clase `dark` a `<div>`)
- `frontend/src/components/settings/AppearanceSettings.tsx` — bug useState resuelto; usa datos de query directamente + optimistic update
- `frontend/src/components/settings/BusinessSettingsForm.tsx` — onSuccess sincroniza ambas query keys + aplica CSS vars inmediatamente
- `frontend/src/components/layout/AppShell.tsx` — props businessName/logoUrl pasadas desde layout
- `frontend/src/components/layout/Sidebar.tsx` — muestra logo si existe, si no Store icon + nombre
- `frontend/src/types/index.ts` — PurchaseRead actualizado para coincidir con schema backend
- `frontend/src/components/purchases/ConsignmentList.tsx` — `total_cost_mxn` → `total`
- `frontend/src/components/purchases/ConsignmentSettleForm.tsx` — `total_cost_mxn` → `total` (3 ocurrencias)
- `frontend/src/components/purchases/PurchaseDetail.tsx` — `reference_number` → `folio`
- `frontend/src/app/globals.css` — font smoothing en `html`, text-wrap balance/pretty
- `frontend/src/components/ui/PageHeader.tsx` — `transition` + `active:scale-[0.96]`
- `frontend/src/components/ui/DataTable.tsx` — pagination buttons: `py-1.5→py-2` (hit area) + scale
- `frontend/src/app/(auth)/login/page.tsx` — submit scale, eye toggle `w-10 h-10`, logo `ring-1 ring-black/10`
- `frontend/src/app/(auth)/change-password/page.tsx` — submit scale
- `frontend/src/components/pos/OpenSessionModal.tsx` — submit scale
- `frontend/src/components/pos/CloseSessionModal.tsx` — ambos botones scale
- `frontend/src/components/pos/PaymentPanel.tsx` — Cobrar: `transition-all→transition`, `scale-[0.98]→scale-[0.96]`
- `frontend/src/components/settings/BusinessSettingsForm.tsx` — save scale
- `frontend/src/components/settings/AppearanceSettings.tsx` — theme buttons scale
- `frontend/src/components/settings/SettingsManager.tsx` — tab buttons scale
- `frontend/src/components/catalog/CatalogManager.tsx` — tab buttons scale
- `frontend/src/components/catalog/CategoryList.tsx` — submit scale
- `frontend/src/components/catalog/ProductList.tsx` — "Agregar" scale
- `frontend/src/components/purchases/ConsignmentInForm.tsx` — submit scale
- `frontend/src/components/purchases/ConsignmentSettleForm.tsx` — submit scale
- `frontend/src/components/purchases/PurchaseForm.tsx` — next + submit scale
- `frontend/src/components/pos/ReceiptModal.tsx` — primary button scale
- `frontend/src/components/gift-cards/IssueGiftCardModal.tsx` — submit scale
- `frontend/src/components/gift-cards/RedeemGiftCardModal.tsx` — submit scale
- `frontend/src/components/returns/ReturnForm.tsx` — step buttons scale
- `frontend/src/components/customers/CustomerForm.tsx` — submit scale
- `frontend/src/components/suppliers/SupplierForm.tsx` — submit scale
- `frontend/src/components/reports/DailyReport.tsx` — download scale
- `frontend/src/components/reports/InventoryReport.tsx` — download buttons scale

**Key decisions:**

- **Theme apply-to-DOM**: El theme y primary_color deben aplicarse a `document.documentElement` (elemento `<html>`) vía `style.setProperty()` y `.classList.toggle("dark", ...)`. El error anterior: `Providers.tsx` aplicaba la clase `dark` a un `<div>` usando `user.theme_preference` (campo que no existe).
- **React query key sync**: `AppLayout` usa `["business-settings"]`, `BusinessSettingsForm` usa `["settings", "business"]`. En `onSuccess` se actualizan ambas keys con `queryClient.setQueryData`.
- **useState initialization bug**: `useState(queryResult?.field)` siempre inicia con `undefined` antes de que la query cargue. Solución: derivar directamente de la query + optimistic update con `queryClient.setQueryData` en `onMutate`.
- **make-interfaces-feel-better principles aplicados**:
  - `transition-colors` → `transition` en todos los botones primarios (incluye transform para que `active:scale` anime)
  - `active:scale-[0.96]` en todos los botones primarios del sistema (26 componentes)
  - `disabled:active:scale-100` para cancelar el efecto en estado deshabilitado
  - `transition-all` eliminado del botón "Cobrar" del PaymentPanel (violaba el estándar)
  - Hit area del eye toggle: `w-10 h-10` (40×40px mínimo)
  - Pagination buttons: `py-1.5` → `py-2` (~40px hit area)
  - Logo image outline: `ring-1 ring-black/10`
- **TypeScript check:** `npx tsc --noEmit` → 0 errores antes del rebuild
- **Docker rebuild pendiente**: Docker Desktop no estaba corriendo al final de la sesión. Comando: `docker compose build frontend && docker compose up -d frontend`

**Skills activated:** react-best-practices, nextjs, frontend-design, make-interfaces-feel-better, systematic-debugging

**Env changes:** ninguna

**DB changes:** ninguna

**Blockers:** Docker Desktop requiere arranque manual para el rebuild

**Version bump:** V2026.05.07-001

**Status on close:** complete — todos los cambios en source; pendiente rebuild Docker cuando Docker Desktop esté corriendo

[ARCHIVED]

---

## Session 2026-05-07 — Ticket settings: configuración de impresión de recibos

**Goal:** Añadir nueva tab "Ticket" en Configuración con campos de header/footer, toggles logo/IVA, y selección de impresora Windows.

**Affected files:**

- `backend/alembic/versions/20260507_001006_ticket_settings.py` (CREADO)
- `backend/app/models/business_settings.py` — 5 nuevas columnas
- `backend/app/schemas/business_settings.py` — campos en Read + Update
- `backend/app/routers/settings.py` — endpoint `GET /v1/settings/printers`
- `print_bridge/main.py` (CREADO) — daemon FastAPI para impresoras Windows del host
- `print_bridge/requirements.txt` (CREADO)
- `frontend/src/types/index.ts` — interfaz `BusinessSettings` extendida
- `frontend/src/lib/api.ts` — `settingsApi.getPrinters()`
- `frontend/src/components/settings/TicketSettings.tsx` (CREADO)
- `frontend/src/components/settings/SettingsManager.tsx` — tab "Ticket" añadida

**Key decisions:**

- **Print Bridge architecture**: El backend corre en Docker y no tiene acceso directo a las impresoras Windows del host. Solución: daemon `print_bridge/main.py` (FastAPI en puerto 9100) que corre en el HOST, enumera impresoras vía `wmic printer get name` (Windows) o `lpstat -a` (Unix), y acepta trabajos de impresión. El backend lo proxea via httpx desde `GET /v1/settings/printers`. Si Print Bridge no está disponible, el endpoint responde `{"available": false}` sin error.
- **Printer UI fallback**: Si `detectedPrinters.length > 0` → dropdown `<select>`. Si está vacío (Print Bridge no disponible) → campo de texto libre para escribir el nombre manualmente. El botón "Detectar" reintenta la detección on-demand.
- **Toggle switch custom**: Implementado con `<button role="switch" aria-checked={bool}>` + Tailwind translate (`translate-x-0` / `translate-x-5`). Sin dependencia externa.
- **Alembic chaining**: `down_revision = "20260506001005"` enlaza correctamente con la migración anterior.
- **`populated` state pattern**: Evita el loop `useEffect + reset` en formularios con `react-hook-form`. La bandera `populated` impide que la query re-inicialice el formulario después del primer mount.
- **Query key dual sync**: `onSuccess` actualiza tanto `["business-settings"]` como `["settings", "business"]` para mantener coherencia entre el layout y el formulario.
- **Migration 001006 aplicada exitosamente**: `Running upgrade 20260506001005 -> 20260507001006` confirmado en logs de arranque del backend.

**Skills activated:** fastapi, pydantic, sqlalchemy, alembic, react-best-practices, nextjs

**Env changes:**

- `PRINT_BRIDGE_URL` y `PRINT_BRIDGE_ENABLED` (ya estaban en `.env.example` desde Ola 5)

**DB changes:**

- Migration `20260507001006`: añade `ticket_header` (Text), `ticket_footer` (Text), `ticket_show_logo` (Boolean, default true), `ticket_show_iva` (Boolean, default false), `ticket_printer_name` (String 255) a `business_settings`

**Blockers:** ninguno

**Pendiente futuro (no solicitado aún):**

- Cablear `TicketSettings` config con impresión real ESC/POS desde `ReceiptModal.tsx` cuando se complete una venta. Actualmente el modal usa `window.print()` del browser; la config de ticket ya está almacenada, pero el puente de impresión real aún no está integrado.
- Instalar y arrancar `print_bridge/main.py` en el host para habilitar auto-detección de impresoras.

**Version bump:** V2026.05.07-002

**Status on close:** complete — migración aplicada, contenedores corriendo, tab Ticket disponible en Configuración

[ARCHIVED]

---

## Session 2026-05-07 — Print Bridge cross-platform + impresión directa ESC/POS

**Goal:** (1) Hacer el Print Bridge funcional en Windows/Mac/Linux/Raspberry Pi con compatibilidad iOS y Android. (2) Corregir detección de impresoras (wmic deprecado en Windows 11). (3) Implementar impresión directa desde el modal de recibo sin abrir el viewer del browser.

**Affected files:**

- `print_bridge/main.py` — v1.2.0: `_list_windows_printers()` usa PowerShell `Get-Printer` (primary) + wmic (fallback); `_print_raw_usb()` para Raspberry Pi sin CUPS; `GET /status` endpoint; fallback en `_print_cups()` a `/dev/usb/lpN`
- `print_bridge/requirements.txt` — añadido `pyusb>=1.2.1; sys_platform == "linux"`
- `print_bridge/start.sh` (CREADO) — script bash para Mac/Linux/Pi con aviso de grupo `lp`
- `print_bridge/install_service.py` — reescrito completo: Windows (nssm/sc.exe), macOS (launchd plist), Linux/Pi (systemd user service + loginctl enable-linger)
- `print_bridge/README.md` (CREADO) — guía de despliegue completa por plataforma
- `docker-compose.yml` — `extra_hosts: host.docker.internal:host-gateway` en backend (resuelve el nombre en Linux/Pi donde Docker no lo inyecta automáticamente); `PRINT_BRIDGE_URL` y `PRINT_BRIDGE_ENABLED` explícitos en environment
- `.env` — `PRINT_BRIDGE_URL=http://host.docker.internal:9100`, `PRINT_BRIDGE_ENABLED=true`
- `.env.example` — mismo cambio + nota explicativa sobre host.docker.internal
- `backend/app/services/receipt_service.py` (CREADO) — generador ESC/POS manual (sin dependencias externas): `COLS=42`, helpers `_center/_cols/_line/_money/_encode`, `build_receipt(sale, settings) -> bytes` con ticket completo (header, folio, items, totales, IVA condicional, pagos, cambio, footer, corte parcial)
- `backend/app/routers/sales.py` — añadido `POST /{sale_id}/print`: carga venta + settings, llama `receipt_service.build_receipt()`, envía hex bytes al Print Bridge vía httpx
- `frontend/src/lib/api.ts` — `salesApi.printReceipt(token, saleId)` → `POST /v1/sales/{id}/print`
- `frontend/src/components/pos/ReceiptModal.tsx` — `handlePrint()` reemplazado: llama API primero, muestra estados "Imprimiendo…" / "Impreso ✓" / error banner; fallback automático a `window.print()` si Print Bridge no está disponible (503/502/504) o no configurado

**Key decisions:**

- **iOS/Android no necesitan Print Bridge**: son clientes browser que se conectan al servidor. El flujo es Browser → Backend (Docker) → Print Bridge (host) → Impresora. Nunca hay comunicación directa entre el cliente móvil y el puerto 9100.
- **`host.docker.internal` en Linux**: Docker Desktop lo inyecta en Windows/Mac automáticamente, pero Docker Engine en Linux/Pi no. Solución: `extra_hosts: - "host.docker.internal:host-gateway"` en docker-compose — aplica en todas las plataformas sin romper nada.
- **wmic deprecado en Windows 11**: `wmic printer get name` ya no está en PATH. Fix: PowerShell `Get-Printer | Select-Object -ExpandProperty Name` como método primario, wmic como fallback para sistemas viejos.
- **Raspberry Pi sin CUPS**: escritura directa a `/dev/usb/lp0` vía `open(device, "wb")`. Requiere que el usuario esté en el grupo `lp` (`sudo usermod -a -G lp $(whoami)`).
- **ESC/POS manual vs python-escpos**: generación manual de bytes para no añadir dependencias pesadas al backend. Los comandos necesarios son simples: INIT, BOLD, ALIGN, FONT_LARGE, NEWLINE, CUT_PARTIAL.
- **Fallback inteligente en ReceiptModal**: si el endpoint retorna 503 (Print Bridge no habilitado), 502 (no disponible), o el mensaje contiene "No hay impresora", cae silenciosamente a `window.print()` en lugar de mostrar error.
- **Print Bridge reiniciado manualmente**: se mató el proceso viejo (PIDs 28456 y 30280) y se relanzó con el nuevo código via PowerShell `Start-Process`.

**Skills activated:** fastapi, docker, react-best-practices, systematic-debugging

**Env changes:**

- `PRINT_BRIDGE_URL` cambiado de `http://localhost:9100` → `http://host.docker.internal:9100`
- `PRINT_BRIDGE_ENABLED` cambiado de `false` → `true`
- `extra_hosts` añadido al servicio `backend` en docker-compose.yml

**DB changes:** ninguna

**Blockers:** ninguno

**Version bump:** V2026.05.07-003

**Status on close:** complete — impresión directa ESC/POS funcional end-to-end; Print Bridge corriendo en host Windows; contenedores up

[ARCHIVED]

---

## Session 2026-05-07 — Print Bridge v1.4.0: fix PDF printer vacío (error 1804 GDI)

**Goal:** Corregir error `(1804, 'StartDocPrinter', 'The specified datatype is invalid.')` al imprimir en Microsoft Print to PDF y otros drivers virtuales.

**Affected files:**

- `print_bridge/main.py` — v1.4.0: `_print_windows_text()` reescrita completamente

**Key decisions:**

- **Error 1804 root cause**: El datatype `"TEXT"` del spooler de Windows es un artefacto de Windows NT que Microsoft Print to PDF ya no soporta. El driver solo acepta `"RAW"` (ESC/POS binario) o el pipeline GDI nativo.
- **Solución: GDI via win32ui**: En lugar del spooler, se usa `win32ui.CreateDC()` → `CreatePrinterDC(printer_name)` → `SelectObject(font)` → `TextOut()` por cada línea. Este es el mismo pipeline que usa cualquier aplicación Windows (Word, Notepad, etc.) para imprimir. Funciona con cualquier driver incluyendo PDF, XPS, OneNote y impresoras reales.
- **Font**: Courier New 9pt (height negativo = cell height en GDI). Márgenes 0.25 pulgadas. Line spacing = font_height × 1.15.
- **Cleanup pattern**: El finally block restaura el font original (`dc.SelectObject(old_font)`), borra el font GDI (`font.DeleteObject()`) y libera el DC (`dc.DeleteDC()`).
- **win32ui siempre disponible en pywin32**: `win32ui` forma parte del mismo paquete que `win32print` — no se requiere dependencia adicional.
- **Comportamiento esperado con PDF**: Microsoft Print to PDF abrirá un diálogo "Guardar como" para elegir dónde guardar el PDF. Eso es comportamiento normal del driver.

**Skills activated:** systematic-debugging

**Env changes:** ninguna

**DB changes:** ninguna

**Blockers:** ninguno

**Version bump:** V2026.05.07-004

**Status on close:** complete — GDI fix aplicado; pendiente instalar Pillow + reiniciar Print Bridge

[ARCHIVED]

---

## Session 2026-05-07 — Print Bridge v1.4.x: header/footer vacíos + logo en PDF

**Goal:** (1) Corregir que header y footer configurados en la app no aparecían en el ticket impreso. (2) Implementar impresión del logo en modo GDI (PDF driver).

**Affected files:**

- `backend/app/schemas/business_settings.py` — validator `empty_str_to_none` para campos Text
- `backend/app/routers/sales.py` — pasa `logo_url` al Print Bridge cuando `ticket_show_logo=True`
- `print_bridge/main.py` — función `_gdi_draw_logo()` nueva; `_print_windows_text()` acepta `logo_url`; `PrintJob` añade campo `logo_url: str = ""`
- `print_bridge/requirements.txt` — añadido `Pillow>=10.0.0`

**Key decisions:**

- **Root cause header/footer vacíos**: La DB tenía `ticket_header = ''` y `ticket_footer = ''` (cadenas vacías). `exclude_none=True` en `model_dump` NO excluye `""` (solo excluye `None`), por lo que un guardado previo con campos vacíos sobrescribió los valores. Fix: validator Pydantic `empty_str_to_none` en `BusinessSettingsUpdate` que convierte cualquier string vacío/whitespace a `None` antes de la validación — así `exclude_none=True` lo excluye y no toca el campo existente en la DB.
- **Logo con `PIL.ImageWin.Dib`**: El objeto `ImageWin.Dib` de Pillow acepta directamente un Windows HDC (`dc.GetHandleAttrib()`). Se redimensiona a máximo 2 pulgadas de ancho manteniendo aspect ratio, se centra horizontalmente con `HORZRES`, y se dibuja antes del texto. Si falla (URL inaccesible, Pillow no instalado), se omite silenciosamente.
- **`logo_url` propagación**: Backend evalúa `biz_settings.ticket_show_logo and biz_settings.logo_url` antes de enviar al bridge. Si el toggle está desactivado o no hay URL, envía `""` y el bridge omite el logo.
- **Pillow como dependencia nueva del Print Bridge**: Necesario para `ImageWin`. Se instala con `pip install Pillow>=10.0.0` en el host (no en Docker).
- **Validators de campos en `BusinessSettingsUpdate`**: Aplicado a `ticket_header`, `ticket_footer`, `address`, `receipt_footer`, `logo_url`, `logo_small_url`, `favicon_url` — todos los campos Text opcionales que no deberían guardarse como cadena vacía.

**Skills activated:** systematic-debugging, fastapi, pydantic

**Env changes:** ninguna

**DB changes:** ninguna de schema. Los valores `''` en `ticket_header`/`ticket_footer` deben actualizarse manualmente o guardando de nuevo desde la UI.

**Blockers:** ninguno

**Pendiente:**

- Instalar Pillow en el host: `pip install Pillow>=10.0.0` en la carpeta `print_bridge`
- Reiniciar Print Bridge después de instalar Pillow
- Hot-patch del backend: `docker cp` de `sales.py` y `business_settings.py` → `docker restart pos-backend`

**Version bump:** V2026.05.07-005

**Status on close:** complete — código aplicado, hot-patched al backend, Print Bridge reiniciado con Pillow

[ARCHIVED]

---

## Session 2026-05-07 — /audit-full completo + README español + primer push a GitHub

**Goal:** (1) Completar auditoría de seguridad completa `/audit-full` (5 fases). (2) Crear README en español. (3) Primer commit y push al repositorio GitHub personal.

**Affected files:**

- `docs/security/2026-05-07-v1-security-audit.pdf` (CREADO)
- `scripts/audit-data/2026-05-07-v1-findings.json` (CREADO)
- `scripts/audit-data/2026-05-07-v1-compliance-scores.json` (CREADO)
- `scripts/generate_security_report.py` (CREADO)
- `README.md` — reescrito completo en español
- `.gitignore` — actualizado: include PDF/audit-data, exclude chunk\_\*.js y archivos scratch

**Key decisions:**

- **Auditoría completa — 12 findings**: 0 CRITICAL, 2 HIGH, 5 MEDIUM, 3 LOW, 2 INFO. Risk score: 42/100 (RED). Los HIGH son: (1) rate limiting completamente ausente — brute-force posible en login; (2) audit logs ausentes para mutaciones de usuarios y cambios de settings. MEDIUM más importante: SSRF via logo_url en Print Bridge sin validación de dominio.
- **Fortalezas confirmadas**: bcrypt, Pydantic en todos los routes, SQLAlchemy parameterizado, RBAC 3 niveles, UUID primary keys, soft deletes, non-root en Docker, docs deshabilitados en producción.
- **backend/.env.test está committed**: contiene solo credenciales de prueba (no reales), pero es LOW finding. Se debe agregar a .gitignore en próximo fix.
- **PDF generado con reportlab** (no md-to-pdf): `python scripts/generate_security_report.py` → `docs/security/2026-05-07-v1-security-audit.pdf`. Páginas: cover + risk score, compliance frameworks, findings por severidad, remediation priority, confirmed positives.
- **GitHub para proyectos personales**: remoto configurado como `https://github.com/ardepa710/pos.git`. Token (ghp\_...) usado solo para el push, removido del remote URL inmediatamente después. No persiste en `.git/config`.
- **Commit incluye todos los cambios** de las sesiones 2026-05-07 (ticket settings, GDI fix, logo, header/footer validator, customers/suppliers routers, receipt service, TicketSettings UI).
- **.gitignore actualizado**: `docs/security/*.pdf` y `scripts/audit-data/` eliminados de exclusiones (se quieren en el repo). Añadidos: `chunk_*.js`, `reports_chunk.js`, `returns_chunk_check.js`, `report_service.py`, `login_attempt.png`, `qa_*.png` (scratch/debug files en raíz).

**Compliance scores (referencia):**

| Framework | Score   | %     |
| --------- | ------- | ----- |
| SOC2 TSC  | 7.5/28  | 26.8% |
| HIPAA     | 6.5/18  | 36.1% |
| CMMC L2   | 7.5/22  | 34.1% |
| ISO 27001 | 10.5/24 | 43.8% |

**Skills activated:** audit-full, python-best-practices

**Env changes:** ninguna

**DB changes:** ninguna

**Blockers:** ninguno

**Version bump:** V2026.05.07-005 (sin cambio — mismo commit que header/footer session)

**Status on close:** complete — PDF generado, README creado, 9 commits pusheados a https://github.com/ardepa710/pos

[ARCHIVED]

---

## Session 2026-05-07 — Branch model setup + PR #1 abierto en GitHub

**Goal:** Crear PR de la sesión actual en GitHub. Establecer modelo de ramas ardepa (`main`/`master`).

**Affected files:**

- `scripts/pr-body.md` (CREADO — cuerpo del PR, puede eliminarse después)
- `CONTEXT.md` — esta entrada

**Key decisions:**

- **gh CLI no está instalado** en este entorno — PR creado vía GitHub REST API (`Invoke-RestMethod`).
- **Modelo de ramas establecido**:
  - `main` → rama de producción — apunta al commit inicial de scaffolding (`3d5705a` Ola 0). Equivale al `main` del modelo ardepa (§24.4).
  - `master` → rama de integración/desarrollo — contiene todos los commits de trabajo real. Actúa como `development` hasta que se renombre formalmente.
  - GitHub había auto-inicializado `main` con un commit vacío (`7f7411c`); reemplazado con force-push a `3d5705a`.
- **PR #1**: `master → main`, título "feat(pos): sistema completo - print bridge GDI, ticket settings, auditoria de seguridad". URL: https://github.com/ardepa710/pos/pull/1
- **Token GitHub**: usado temporalmente en remote URL para push/API, removido inmediatamente después. No persiste en `.git/config`. Valor en `.env` (no committed).
- **`scripts/pr-body.md`**: archivo auxiliar creado para pasar el cuerpo del PR a la API. Puede borrarse — no tiene valor permanente.

**Skills activated:** ninguno específico

**Env changes:** ninguna

**DB changes:** ninguna

**Blockers:** ninguno

**Version bump:** V2026.05.07-005 (sin cambio)

**Status on close:** complete — PR #1 abierto en https://github.com/ardepa710/pos/pull/1

[ARCHIVED]

---

## Session 2026-05-07 — obsidian-sync manual

**Goal:** Ejecutar hook obsidian-sync manualmente para sincronizar el vault y el dashboard.

**Affected files:** ninguno en el repo — solo escrituras en Obsidian vault y Supabase

**Key decisions:**

- Hook ejecutado con `node ~/.claude/hooks/obsidian-sync.mjs` desde el cwd del proyecto.
- Resultado: DAILY-OK, MAIN-OK, DASHBOARD-OK — sincronización completa sin errores.
- Nota vault: `Wiki/002-Personal APP Projects/POS/Daily Job/2026-05-07.md` actualizado.
- Dashboard Supabase (`tbmproject_projects`, `tbmproject_daily_recaps`) sincronizado para slug `pos`.

**Skills activated:** ninguno

**Env changes:** ninguna

**DB changes:** ninguna (solo mirror en tbmproject\_\*)

**Blockers:** ninguno

**Version bump:** V2026.05.07-005 (sin cambio)

**Status on close:** complete

[ARCHIVED]

---

## Session 2026-05-08 — Revisión de pendientes del proyecto

**Goal:** Revisar el estado completo del proyecto y generar lista priorizada de tareas pendientes.

**Affected files:** ninguno

**Key decisions:**

- Sistema v1 completamente funcional — todas las features del plan v1.2 operando.
- PR #1 abierto en GitHub (master → main) — pendiente de merge.
- Pendientes priorizados identificados:
  - **Inmediato**: merge PR #1; `git rm --cached backend/.env.test`
  - **HIGH security (F001/F002)**: rate limiting con slowapi; audit logs en user_service y settings_service
  - **MEDIUM security**: SSRF logo_url (F005); CSP header Caddyfile (F006); password admin default (F003); JWT 8h (F004)
  - **Deuda técnica**: tests (ninguno escrito aún); SQLAlchemy echo; security headers next.config.ts
  - **Infraestructura**: GitHub Actions CI/CD; deploy staging coralslrc.shop; rename master → development

**Skills activated:** ninguno

**Env changes:** ninguna

**DB changes:** ninguna

**Blockers:** ninguno

**Version bump:** V2026.05.07-005 (sin cambio)

**Status on close:** complete — backlog documentado, sin cambios de código
