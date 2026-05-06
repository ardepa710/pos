# POS — Plan de Implementación

> **Estado:** Plan v1.0 — listo para revisión
> **Autor:** Claude Opus 4.7 (planeación) → ejecución posterior con Sonnet 4.6
> **Fecha:** 2026-05-06
> **Proyecto:** `C:\Develop\ardepa-projects\POS`
> **Idioma:** Código en inglés · UI en español de México (es-MX)

---

## 1. Visión y alcance

Sistema de Punto de Venta (POS) para mini y pequeños comercios — colectivos, tiendas de ropa y accesorios. Se instala localmente vía Docker Compose en una computadora del cliente (Windows / macOS / Linux). Una sola caja por instalación inicial; la base de datos y API quedan listas para que en una segunda fase se conecte una app iOS/Android.

### 1.1 Objetivos

1. **Operación diaria sin fricción:** ticket de venta en menos de 30 segundos para el caso público en general / pago en efectivo.
2. **Doble divisa nativa:** MXN como base, USD calculado al tipo de cambio del día (Banxico DOF).
3. **Inventario flexible:** control on/off por artículo (tiendas de consignación venden libre).
4. **Consignación de proveedores:** flujo de liquidación por periodo con comisión configurable.
5. **Tarjetas de regalo con QR único:** saldo gastable en múltiples visitas.
6. **Devoluciones automáticas a tarjeta de regalo:** una sola mecánica para crédito a favor.
7. **Reportes operativos:** ventas por periodo, ventas por proveedor (consignación), ventas vs. costos.
8. **Listo para móvil:** API REST versionada (`/api/v1`), JWT, contratos OpenAPI para que iOS/Android consuma la misma BD.

### 1.2 Fuera de alcance (v1.0)

- Multi-sucursal / sincronización entre tiendas.
- Facturación electrónica CFDI (se contempla como adaptador en v2).
- Multi-tenant en la misma instalación (un Docker = un negocio).
- Pagos integrados con terminal bancaria física (la app solo registra el método).
- E-commerce / catálogo público.

---

## 2. Stack técnico y justificación

| Capa                | Elección                                                          | Por qué                                                                                                |
| ------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Backend             | **Python 3.12 + FastAPI**                                         | Alineado con §23 del CLAUDE.md; async nativo, OpenAPI auto-generado para el cliente móvil.             |
| ORM                 | **SQLAlchemy 2.0 (async)**                                        | Estándar §15.5; tipado estricto + Alembic para migraciones.                                            |
| Migraciones         | **Alembic**                                                       | Obligatorio §12.3.                                                                                     |
| Validación          | **Pydantic v2**                                                   | Modelos de request/response, settings.                                                                 |
| Auth                | **JWT (HS256) + bcrypt**                                          | Cookies HTTP-only para web; Bearer token para móvil.                                                   |
| BD                  | **PostgreSQL 16-alpine**                                          | Soporte JSONB, NUMERIC para dinero, índices parciales.                                                 |
| Frontend            | **Next.js 15 (App Router) + TypeScript estricto**                 | §15.2; SSR + RSC para dashboards; `output: "standalone"` para Docker.                                  |
| UI Kit              | **shadcn/ui (base) + HeroUI (componentes ricos)**                 | shadcn = primitivas + accesibilidad; HeroUI = tablas, date pickers, autocompletes con buen UX.         |
| Estilos             | **Tailwind CSS v4**                                               | §14; tokens vía CSS variables para tema light/dark.                                                    |
| Estado cliente      | **Zustand** (UI/cart) + **TanStack Query** (server state)         | Ligero, no Redux.                                                                                      |
| Forms               | **react-hook-form + Zod**                                         | Validación cliente espejo del backend Pydantic.                                                        |
| QR                  | Backend: `qrcode[pil]` · Frontend: `react-qr-code`                | QR único por tarjeta de regalo.                                                                        |
| Programación        | **APScheduler** (en proceso FastAPI)                              | Job diario de tipo de cambio Banxico.                                                                  |
| Reportes PDF        | **reportlab**                                                     | §10.5, §11.                                                                                            |
| Tests               | **pytest + httpx** (backend) · **vitest + Playwright** (frontend) | §23.5.                                                                                                 |
| Empaquetado         | **Docker Compose**                                                | §5.2; un solo `docker compose up -d`.                                                                  |
| Reverse proxy local | **Caddy** (en lugar de nginx-proxy)                               | TLS automático en localhost vía mkcert opcional; más sencillo que nginx para instalación sin sysadmin. |

> **Nota multi-stack:** la app es **monorepo** con dos servicios (`backend/`, `frontend/`). Docker Compose orquesta ambos + Postgres + Caddy.

---

## 3. Arquitectura del sistema

```
┌──────────────────────────────────────────────────────────────────────┐
│  Computadora del cliente (Win/macOS/Linux) — Docker Desktop / Engine │
│                                                                       │
│  ┌─────────────┐   ┌────────────────┐   ┌─────────────────────────┐  │
│  │   Caddy     │──▶│  Frontend      │──▶│  Backend FastAPI        │  │
│  │ :80 / :443  │   │  Next.js 15    │   │  uvicorn :8000          │  │
│  │ (proxy)     │   │  (standalone)  │   │  ┌─────────────────┐    │  │
│  └─────────────┘   └────────────────┘   │  │ APScheduler     │    │  │
│         ▲                                │  │ (FX rate diario)│    │  │
│         │                                │  └─────────────────┘    │  │
│         │                                └──────────┬──────────────┘  │
│         │                                           │                 │
│         │                                           ▼                 │
│   Navegador o                              ┌─────────────────────┐   │
│   futura app móvil                          │ PostgreSQL 16        │   │
│   (LAN: http://pos.local                    │ volumen persistente  │   │
│    o IP del equipo)                         └─────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
                       │
                       ▼
        Internet (solo para job diario de tipo de cambio Banxico)
```

### 3.1 Modelo de despliegue

- **Una instalación = un negocio.** No hay multi-tenancy en v1.
- Sin embargo, todos los modelos llevan `tenant_id UUID DEFAULT '00000000-...'` con índice y FK no-nulo, listos para v2 (sincronización entre tiendas / SaaS).
- LAN: el equipo que corre el Docker actúa como servidor. Otras cajas / dispositivos en la misma red apuntan al hostname/IP del host. Esto cubre el escenario de mostrador + iPad/Android del vendedor en piso.

### 3.2 Roles y autorización

| Rol            | Capacidades                                                                                                            |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **admin**      | Todo: usuarios, configuración, aprobaciones, reportes financieros, eliminar/cancelar.                                  |
| **supervisor** | Aprobar compras, ver reportes, cancelar ventas con motivo, gestionar tarjetas de regalo.                               |
| **cashier**    | Vender, consultar catálogo de productos/clientes, generar tarjetas de regalo, devoluciones (solo a tarjeta de regalo). |

JWT incluye `role` y `user_id`. RBAC vía dependencias FastAPI (`require_role("admin", "supervisor")`).

---

## 4. Esquema de base de datos

> Todas las tablas: `id UUID PK`, `created_at`, `updated_at`, `tenant_id UUID DEFAULT gen_random_uuid()` (placeholder v2), `deleted_at` para soft delete. Conexiones siempre `sslmode=require` (§4.1) — incluso a postgres en docker network, por consistencia.

### 4.1 Identidad y configuración

```sql
-- Usuarios del sistema
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  password_hash VARCHAR(120) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','supervisor','cashier')),
  theme_preference VARCHAR(10) NOT NULL DEFAULT 'system' CHECK (theme_preference IN ('light','dark','system')),
  language VARCHAR(10) NOT NULL DEFAULT 'es-MX',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Configuración global del negocio (1 fila)
CREATE TABLE business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name VARCHAR(120) NOT NULL,
  rfc VARCHAR(20),
  address TEXT,
  phone VARCHAR(20),
  base_currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
  secondary_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.16,
  fx_source VARCHAR(20) NOT NULL DEFAULT 'banxico',
  receipt_footer TEXT,
  logo_url TEXT,
  tenant_id UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.2 Catálogo

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL,
  parent_id UUID REFERENCES categories(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (tenant_id, name, parent_id)
);
CREATE INDEX idx_categories_parent ON categories(parent_id) WHERE deleted_at IS NULL;

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(40) NOT NULL,
  barcode VARCHAR(40),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  -- Pricing tiers (in base currency MXN)
  price_general NUMERIC(14,4) NOT NULL,
  price_a NUMERIC(14,4),
  price_b NUMERIC(14,4),
  price_c NUMERIC(14,4),
  -- Cost tracking (last cost from purchases module)
  last_cost NUMERIC(14,4),
  last_cost_updated_at TIMESTAMPTZ,
  -- Inventory
  track_inventory BOOLEAN NOT NULL DEFAULT TRUE,
  stock_quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  reorder_point NUMERIC(14,3),
  unit_of_measure VARCHAR(20) NOT NULL DEFAULT 'pza',
  -- Consignment metadata (current ownership)
  is_consigned BOOLEAN NOT NULL DEFAULT FALSE,
  consigned_supplier_id UUID,
  -- Display
  thumbnail_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (tenant_id, sku),
  CHECK (price_general >= 0)
);
CREATE INDEX idx_products_category ON products(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_barcode ON products(barcode) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_active ON products(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);

-- Movimientos de stock (auditoría + base para reportes)
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN
    ('purchase_in','sale_out','return_in','adjustment_in','adjustment_out','consignment_return_out')),
  quantity NUMERIC(14,3) NOT NULL,
  reference_type VARCHAR(30),  -- 'purchase' | 'sale' | 'return' | 'adjustment'
  reference_id UUID,
  unit_cost NUMERIC(14,4),
  notes TEXT,
  actor_id UUID REFERENCES users(id),
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id, created_at DESC);
CREATE INDEX idx_stock_movements_ref ON stock_movements(reference_type, reference_id);
```

### 4.3 Clientes y proveedores

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL,            -- 'PG' for público en general
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(30),
  rfc VARCHAR(20),
  address TEXT,
  price_tier VARCHAR(10) NOT NULL DEFAULT 'general'
    CHECK (price_tier IN ('general','a','b','c')),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE for público en general
  notes TEXT,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (tenant_id, code)
);
-- Solo un cliente default por tenant
CREATE UNIQUE INDEX idx_customers_default ON customers(tenant_id) WHERE is_default = TRUE;

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL,
  legal_name VARCHAR(200) NOT NULL,
  contact_name VARCHAR(150),
  email VARCHAR(150),
  phone VARCHAR(30),
  rfc VARCHAR(20),
  address TEXT,
  -- Tipo y términos
  supplier_type VARCHAR(20) NOT NULL DEFAULT 'normal'
    CHECK (supplier_type IN ('normal','consignment','both')),
  consignment_period_days INTEGER,
  consignment_commission_pct NUMERIC(5,4),  -- 0.0000 .. 1.0000
  payment_terms_days INTEGER DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (tenant_id, code),
  CHECK (
    supplier_type = 'normal' OR
    (consignment_period_days IS NOT NULL AND consignment_commission_pct IS NOT NULL)
  )
);
```

### 4.4 Tipo de cambio

```sql
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_date DATE NOT NULL,
  base_currency VARCHAR(3) NOT NULL,        -- 'USD'
  quote_currency VARCHAR(3) NOT NULL,       -- 'MXN'
  rate NUMERIC(14,6) NOT NULL,              -- 1 USD = N MXN
  source VARCHAR(20) NOT NULL DEFAULT 'banxico',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id UUID NOT NULL,
  UNIQUE (tenant_id, rate_date, base_currency, quote_currency)
);
CREATE INDEX idx_exchange_rates_date ON exchange_rates(rate_date DESC);
```

### 4.5 Compras (normales y consignación)

```sql
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio VARCHAR(20) NOT NULL,               -- 'C-2026-00001'
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  purchase_type VARCHAR(20) NOT NULL CHECK (purchase_type IN ('normal','consignment')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending','approved','cancelled')),
  subtotal NUMERIC(14,4) NOT NULL DEFAULT 0,
  tax NUMERIC(14,4) NOT NULL DEFAULT 0,
  total NUMERIC(14,4) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
  exchange_rate NUMERIC(14,6),              -- snapshot si currency != MXN
  notes TEXT,
  -- Workflow
  created_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id),
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  -- Consignación
  consignment_period_start DATE,
  consignment_period_end DATE,
  consignment_settled BOOLEAN NOT NULL DEFAULT FALSE,
  consignment_settlement_id UUID,
  tenant_id UUID NOT NULL,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (tenant_id, folio)
);
CREATE INDEX idx_purchases_supplier ON purchases(supplier_id, created_at DESC);
CREATE INDEX idx_purchases_status ON purchases(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchases_consign_pending
  ON purchases(supplier_id) WHERE purchase_type='consignment' AND consignment_settled = FALSE;

CREATE TABLE purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(14,4) NOT NULL CHECK (unit_cost >= 0),
  subtotal NUMERIC(14,4) NOT NULL,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_product ON purchase_items(product_id);

-- Liquidaciones de consignación (settlement)
CREATE TABLE consignment_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio VARCHAR(20) NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_sales NUMERIC(14,4) NOT NULL,        -- venta total al público
  commission_pct NUMERIC(5,4) NOT NULL,
  commission_amount NUMERIC(14,4) NOT NULL,
  payable_to_supplier NUMERIC(14,4) NOT NULL, -- gross - commission
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','approved','paid','cancelled')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_reference VARCHAR(120),
  notes TEXT,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, folio)
);
```

### 4.6 Ventas

```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio VARCHAR(20) NOT NULL,                -- 'V-2026-00001'
  customer_id UUID NOT NULL REFERENCES customers(id),
  cashier_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed','cancelled','refunded','partially_refunded')),
  -- Totales (en MXN siempre — base) + snapshot USD
  subtotal_mxn NUMERIC(14,4) NOT NULL,
  tax_mxn NUMERIC(14,4) NOT NULL DEFAULT 0,
  discount_mxn NUMERIC(14,4) NOT NULL DEFAULT 0,
  total_mxn NUMERIC(14,4) NOT NULL,
  total_usd NUMERIC(14,4) NOT NULL,           -- calculado al fx_rate snapshot
  fx_rate_used NUMERIC(14,6) NOT NULL,
  fx_rate_date DATE NOT NULL,
  -- Cancelación / refund
  cancelled_by UUID REFERENCES users(id),
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  notes TEXT,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, folio)
);
CREATE INDEX idx_sales_date ON sales(created_at DESC);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_cashier ON sales(cashier_id, created_at DESC);
CREATE INDEX idx_sales_status ON sales(status);

CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name_snapshot VARCHAR(200) NOT NULL,
  product_sku_snapshot VARCHAR(40) NOT NULL,
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_price_mxn NUMERIC(14,4) NOT NULL,
  unit_cost_snapshot NUMERIC(14,4),           -- last_cost al momento de la venta (para reporte ventas vs costos)
  price_tier_used VARCHAR(10) NOT NULL,
  discount_mxn NUMERIC(14,4) NOT NULL DEFAULT 0,
  subtotal_mxn NUMERIC(14,4) NOT NULL,
  -- Consignación: si el producto era consignado, snapshot del proveedor
  was_consigned BOOLEAN NOT NULL DEFAULT FALSE,
  consigned_supplier_id UUID REFERENCES suppliers(id),
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id, created_at);
CREATE INDEX idx_sale_items_consign
  ON sale_items(consigned_supplier_id, created_at)
  WHERE was_consigned = TRUE;

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  method VARCHAR(20) NOT NULL CHECK (method IN
    ('cash','credit_card','debit_card','gift_card','transfer','other')),
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('MXN','USD')),
  amount NUMERIC(14,4) NOT NULL CHECK (amount > 0),       -- monto en la divisa pagada
  amount_in_mxn NUMERIC(14,4) NOT NULL,                    -- amount * fx_rate
  fx_rate_used NUMERIC(14,6) NOT NULL,
  gift_card_id UUID,                                       -- FK abajo
  card_last4 VARCHAR(4),
  reference VARCHAR(120),
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payments_sale ON payments(sale_id);
CREATE INDEX idx_payments_method ON payments(method, created_at);
```

### 4.7 Tarjetas de regalo

```sql
CREATE TABLE gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) UNIQUE NOT NULL,           -- 'GC-AB12CD34EF'
  qr_payload TEXT NOT NULL,                   -- string firmado para QR
  initial_balance_mxn NUMERIC(14,4) NOT NULL,
  current_balance_mxn NUMERIC(14,4) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','redeemed','expired','cancelled')),
  origin VARCHAR(20) NOT NULL CHECK (origin IN ('purchase','return','manual_adjustment')),
  origin_sale_id UUID REFERENCES sales(id),
  origin_return_id UUID,
  issued_to_customer_id UUID REFERENCES customers(id),
  expires_at TIMESTAMPTZ,
  notes TEXT,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_gift_cards_status ON gift_cards(status);
CREATE INDEX idx_gift_cards_customer ON gift_cards(issued_to_customer_id);

ALTER TABLE payments ADD CONSTRAINT fk_payments_gift_card
  FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id);

CREATE TABLE gift_card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID NOT NULL REFERENCES gift_cards(id),
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN
    ('issue','load','redeem','adjust','expire','cancel')),
  amount_mxn NUMERIC(14,4) NOT NULL,           -- positivo = carga; negativo = uso
  balance_after_mxn NUMERIC(14,4) NOT NULL,
  sale_id UUID REFERENCES sales(id),
  actor_id UUID REFERENCES users(id),
  notes TEXT,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_gc_tx_card ON gift_card_transactions(gift_card_id, created_at DESC);
```

### 4.8 Devoluciones

```sql
CREATE TABLE returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio VARCHAR(20) NOT NULL,                  -- 'D-2026-00001'
  sale_id UUID NOT NULL REFERENCES sales(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  reason VARCHAR(40) NOT NULL CHECK (reason IN
    ('default','wrong_size','wrong_item','customer_change','other')),
  reason_notes TEXT,
  total_refund_mxn NUMERIC(14,4) NOT NULL,
  refund_method VARCHAR(20) NOT NULL DEFAULT 'gift_card'
    CHECK (refund_method IN ('gift_card','cash','original_method')),
  generated_gift_card_id UUID REFERENCES gift_cards(id),
  status VARCHAR(20) NOT NULL DEFAULT 'completed'
    CHECK (status IN ('draft','completed','cancelled')),
  processed_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  notes TEXT,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, folio)
);

CREATE TABLE return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  sale_item_id UUID NOT NULL REFERENCES sale_items(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  refund_amount_mxn NUMERIC(14,4) NOT NULL,
  restock BOOLEAN NOT NULL DEFAULT TRUE,        -- ¿regresar al inventario?
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.9 Auditoría

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id),
  action VARCHAR(60) NOT NULL,                  -- 'sale.create','purchase.approve','gift_card.issue'...
  entity_type VARCHAR(40) NOT NULL,
  entity_id UUID,
  ip_address INET,
  user_agent TEXT,
  payload JSONB,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
```

### 4.10 Datos semilla (seeds)

- 1 usuario `admin` (password forzado a cambiar al primer login).
- 1 cliente default `PG — Público en General` (`is_default = TRUE`).
- 1 fila en `business_settings`.
- Categorías base: `Ropa`, `Accesorios`, `Calzado`, `Otros`.
- 1 fila en `exchange_rates` con rate fallback (ej. 17.0) para que la app arranque sin internet.

---

## 5. Lógica de negocio crítica

### 5.1 Cálculo de precios y divisas

```
Precio en pantalla:
  precio_mxn = product.price_<tier_del_cliente>
  precio_usd = round(precio_mxn / fx_rate_today, 2)

Al cobrar:
  total_mxn = sum(line.subtotal_mxn) + tax - discount
  total_usd = round(total_mxn / fx_rate_today, 2)

  Pagos:
    cada payment.currency puede ser MXN o USD.
    payment.amount_in_mxn = amount * (currency=='USD' ? fx_rate_used : 1)
    sum(payment.amount_in_mxn) DEBE == total_mxn  (±0.01 tolerancia)
```

**Snapshot del fx_rate:** se toma `fx_rate_today` al iniciar la venta, se guarda en `sales.fx_rate_used`. Si la venta dura horas (rara, pero posible), el rate no cambia mid-flight.

### 5.2 Reglas de inventario

```
Al agregar item al carrito:
  if product.track_inventory == TRUE:
    if requested_qty > product.stock_quantity:  → error "Stock insuficiente"
  else:
    permitir cantidad libre

Al confirmar venta (transacción):
  for each sale_item where product.track_inventory:
    UPDATE products SET stock_quantity = stock_quantity - qty WHERE id = ...
    INSERT INTO stock_movements (sale_out, -qty, ref=sale_id)

Al aprobar compra (transacción):
  for each purchase_item:
    UPDATE products SET
      stock_quantity = stock_quantity + qty,
      last_cost = purchase_item.unit_cost,
      last_cost_updated_at = NOW()
    WHERE id = ...
    INSERT INTO stock_movements (purchase_in, +qty, ref=purchase_id, unit_cost=...)
  if purchase.purchase_type == 'consignment':
    UPDATE products SET
      is_consigned = TRUE,
      consigned_supplier_id = purchase.supplier_id
    WHERE id IN (...)

Al procesar return con restock:
  UPDATE products SET stock_quantity = stock_quantity + qty
  INSERT INTO stock_movements (return_in, +qty, ref=return_id)
```

### 5.3 Workflow de compras

```
1. cashier/supervisor crea purchase en status='draft' → puede editar items
2. Marca como 'pending' (envía a aprobación)
3. supervisor o admin → 'approved'
   ▶ TRIGGER: aplicar inventario + actualizar last_cost (atómico)
4. Si error → permite 'cancelled' antes de approved.
   Una compra approved NO se puede revertir; se requiere ajuste de inventario manual.
```

### 5.4 Liquidación de consignación

```
Generación (manual o automática al fin del periodo):
  SELECT
    si.consigned_supplier_id,
    SUM(si.subtotal_mxn) AS gross_sales
  FROM sale_items si
  JOIN sales s ON s.id = si.sale_id
  WHERE si.was_consigned = TRUE
    AND si.consigned_supplier_id = :supplier_id
    AND s.created_at BETWEEN :period_start AND :period_end
    AND s.status IN ('completed','partially_refunded')
  GROUP BY si.consigned_supplier_id

  commission_amount = gross_sales * supplier.consignment_commission_pct
  payable_to_supplier = gross_sales - commission_amount

  → Crea consignment_settlement (status=draft)
  → Admin/supervisor aprueba → status=approved
  → Al registrar pago → status=paid
```

Se vinculan a la liquidación todas las `purchases` en consignación de ese proveedor con `consignment_period_*` que caigan en el rango (`consignment_settlement_id` apunta a la nueva liquidación).

### 5.5 Tarjetas de regalo

```
Emisión:
  - Se compra como "producto especial" en una venta normal (no consume inventario)
    o se genera manualmente por admin/supervisor.
  - code = 'GC-' + base32(random(8 bytes))
  - qr_payload = HMAC(secret, code).b64()  → frontend renderiza QR
  - status='active', current_balance = initial_balance

Uso (como método de pago):
  - Cashier escanea QR o teclea code.
  - Sistema valida: status='active' AND current_balance > 0 AND not expired.
  - Aplica al payment como method='gift_card', currency='MXN'.
  - amount usado se descuenta del balance: INSERT gift_card_transactions(redeem, -amount).
  - Si balance llega a 0 → status='redeemed'.

Devolución → tarjeta de regalo:
  - return.refund_method = 'gift_card' (default).
  - Sistema crea gift_card NUEVA con initial_balance = total_refund.
  - return.generated_gift_card_id ← nueva tarjeta.
  - Se imprime ticket con QR para el cliente.
```

### 5.6 Job diario de tipo de cambio

- APScheduler corre todos los días a las **08:00 hora local del host** (la hora del DOF Banxico se publica ~12:00 UTC).
- Llama a la API pública de Banxico (Serie SF43718 — FIX) o, si falla, a `exchangerate.host` como respaldo.
- Inserta en `exchange_rates` (idempotente vía UNIQUE date+pair).
- Si todo falla N días: usa el último valor disponible y emite warning visible en dashboard (`⚠️ Tipo de cambio desactualizado: última actualización hace X días`).

---

## 6. API REST (FastAPI)

Todas las rutas bajo `/api/v1`. Auth: `Authorization: Bearer <jwt>`. Documentación Swagger en `/api/docs`.

```
POST   /auth/login                    { username, password } → { access, refresh }
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me

# Catálogo
GET    /categories                    ?parent_id=&q=
POST   /categories
PATCH  /categories/{id}
DELETE /categories/{id}                (soft delete)

GET    /products                      ?q=&category=&active=&track_inv=
POST   /products
GET    /products/{id}
PATCH  /products/{id}
POST   /products/{id}/thumbnail        multipart upload
POST   /products/{id}/adjust-stock     { quantity, reason }

# Personas
GET    /customers                     ?q=
POST   /customers
GET    /customers/default              público en general
PATCH  /customers/{id}

GET    /suppliers                     ?type=
POST   /suppliers
PATCH  /suppliers/{id}

# Operación
POST   /sales                          { customer_id, items, payments } → sale + receipt
GET    /sales                         ?from=&to=&cashier=&customer=&status=
GET    /sales/{id}
POST   /sales/{id}/cancel              { reason }   (admin/supervisor)

POST   /purchases                      draft
GET    /purchases                     ?supplier=&type=&status=&from=&to=
GET    /purchases/{id}
PATCH  /purchases/{id}                 (mientras status=draft|pending)
POST   /purchases/{id}/submit          draft → pending
POST   /purchases/{id}/approve         pending → approved (atómico, mueve inventario)
POST   /purchases/{id}/cancel

GET    /consignment/pending           ?supplier_id=
POST   /consignment/settlements        { supplier_id, period_start, period_end }
GET    /consignment/settlements        ?supplier=&status=
POST   /consignment/settlements/{id}/approve
POST   /consignment/settlements/{id}/pay { reference }

# Tarjetas de regalo
POST   /gift-cards                     { initial_balance, customer_id?, expires_at? }
GET    /gift-cards/{code}              público para escaneo (rate-limited)
GET    /gift-cards                    (admin)
POST   /gift-cards/{id}/cancel

# Devoluciones
POST   /returns                        { sale_id, items, reason, refund_method }
GET    /returns                       ?from=&to=&customer=
GET    /returns/{id}

# Reportes
GET    /reports/sales-overall          ?from=&to=&group_by=day|week|month
GET    /reports/sales-by-supplier      ?supplier=&from=&to=
GET    /reports/sales-vs-costs         ?from=&to=&category=&product=
GET    /reports/inventory-valuation
GET    /reports/{name}/export          ?format=pdf|xlsx&...

# Configuración
GET    /settings/business
PATCH  /settings/business              (admin)
GET    /settings/exchange-rate/today
GET    /settings/exchange-rate/history ?from=&to=
POST   /settings/exchange-rate/refresh (admin — fuerza job)

# Usuarios
GET    /users                         (admin)
POST   /users                         (admin)
PATCH  /users/{id}
PATCH  /users/{id}/password           (self o admin)
GET    /users/me/preferences           { theme, language }
PATCH  /users/me/preferences
```

**Política de errores (estándar §3.2):** todas las respuestas error son JSON `{ "error": "CODE", "message": "Texto en español de México", "field": "..." }`. Códigos HTTP semánticos.

**Rate limiting** (§4.3): `/auth/login` 5/min, `/gift-cards/{code}` 30/min, mutaciones generales 60/min.

---

## 7. Frontend — estructura y rutas

### 7.1 Árbol de directorios

```
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx                  # sidebar + topbar
│   │   │   ├── dashboard/page.tsx           # KPIs del día
│   │   │   ├── ventas/
│   │   │   │   ├── nueva/page.tsx          # POS — pantalla de venta
│   │   │   │   ├── historial/page.tsx
│   │   │   │   └── [id]/page.tsx           # detalle/ticket
│   │   │   ├── productos/
│   │   │   │   ├── page.tsx                 # catálogo (tabla)
│   │   │   │   ├── nuevo/page.tsx
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   └── categorias/page.tsx
│   │   │   ├── compras/
│   │   │   │   ├── nueva/page.tsx
│   │   │   │   ├── historial/page.tsx
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   └── consignacion/
│   │   │   │       ├── pendientes/page.tsx
│   │   │   │       └── liquidaciones/page.tsx
│   │   │   ├── clientes/...
│   │   │   ├── proveedores/...
│   │   │   ├── tarjetas-regalo/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── nueva/page.tsx
│   │   │   │   └── [code]/page.tsx
│   │   │   ├── retornos/
│   │   │   │   ├── nuevo/page.tsx
│   │   │   │   └── historial/page.tsx
│   │   │   ├── reportes/
│   │   │   │   ├── ventas/page.tsx
│   │   │   │   ├── consignacion/page.tsx
│   │   │   │   └── ventas-vs-costos/page.tsx
│   │   │   └── configuracion/
│   │   │       ├── perfil/page.tsx          # tema, idioma
│   │   │       ├── negocio/page.tsx
│   │   │       ├── usuarios/page.tsx
│   │   │       └── tipo-cambio/page.tsx
│   │   ├── layout.tsx                       # ThemeProvider + QueryProvider
│   │   └── globals.css                      # tokens CSS variables (§14.2)
│   ├── components/
│   │   ├── ui/                              # shadcn primitives
│   │   ├── pos/
│   │   │   ├── ProductSearch.tsx
│   │   │   ├── Cart.tsx
│   │   │   ├── PaymentPanel.tsx
│   │   │   ├── CustomerSelector.tsx
│   │   │   └── ReceiptDialog.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Topbar.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   └── FxRateBadge.tsx
│   │   └── data-table/                      # tabla compartida (HeroUI)
│   ├── lib/
│   │   ├── api.ts                           # fetch wrapper + tipos
│   │   ├── auth.ts
│   │   ├── currency.ts                      # formatMXN, formatUSD
│   │   ├── i18n.ts                          # cadenas es-MX
│   │   └── permissions.ts
│   ├── stores/
│   │   ├── cart.ts                          # zustand
│   │   ├── auth.ts
│   │   └── theme.ts
│   └── hooks/                               # useProducts, useSales, ...
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts                           # output: 'standalone'
└── Dockerfile
```

### 7.2 Tema y tokens

Implementar §14.2 tal cual: `:root` (dark) + `[data-theme="light"]` con override. Componentes usan únicamente `var(--accent)`, `var(--bg-card)`, etc. — cero colores hardcoded.

`ThemeProvider` lee `users/me/preferences` al login y persiste en localStorage para evitar flash. Setting: `light | dark | system`.

### 7.3 Internacionalización

- Todos los strings UI viven en `lib/i18n.ts` como objeto `es_MX` (clave → texto).
- v1 sin librería de i18n compleja (no `next-intl`); función `t(key)` simple.
- Listo para crecer: estructura de objeto plano permite migrar a `next-intl` sin cambiar callsites.
- Formatos: `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`, `Intl.DateTimeFormat('es-MX')`.

### 7.4 UX — principios clave

| Principio                     | Aplicación                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------- |
| Densidad enterprise           | Tablas con paginación server-side; max 50 filas visibles; `text-sm` por defecto. |
| Mobile-first                  | POS funcional en tablet 10"; sidebar colapsable a `<lg`.                         |
| Atajos de teclado             | `F2` cliente, `F3` agregar producto, `F9` cobrar, `Esc` cancelar línea.          |
| Accesibilidad                 | `aria-label` en todos los íconos; foco visible; min 4.5:1 contraste.             |
| Feedback inmediato            | Optimistic updates en cart; toast en éxito/error de mutaciones.                  |
| Sin estados vacíos sin acción | Cada lista vacía tiene botón "Crear nuevo X".                                    |

---

## 8. Docker / despliegue local

### 8.1 `docker-compose.yml` (resumen)

```yaml
name: pos
services:
  db:
    image: postgres:16-alpine
    container_name: pos-db
    environment:
      POSTGRES_DB: pos
      POSTGRES_USER: pos_app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pos_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "pos_app", "-d", "pos"]
      interval: 5s
      timeout: 3s
      retries: 10
    restart: unless-stopped

  backend:
    build: ./backend
    container_name: pos-backend
    environment:
      DATABASE_URL: postgresql+asyncpg://pos_app:${DB_PASSWORD}@db:5432/pos?sslmode=disable
      JWT_SECRET: ${JWT_SECRET}
      FX_API_PROVIDER: banxico
      ADMIN_INITIAL_PASSWORD: ${ADMIN_INITIAL_PASSWORD}
      TZ: America/Mexico_City
    depends_on:
      db:
        condition: service_healthy
    expose: ["8000"]
    restart: unless-stopped

  frontend:
    build: ./frontend
    container_name: pos-frontend
    environment:
      NEXT_PUBLIC_API_URL: /api
      NODE_ENV: production
    depends_on: [backend]
    expose: ["3000"]
    restart: unless-stopped

  proxy:
    image: caddy:2-alpine
    container_name: pos-proxy
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - pos_caddydata:/data
    depends_on: [frontend, backend]
    restart: unless-stopped

volumes:
  pos_pgdata:
  pos_caddydata:
```

> **Nota sobre `sslmode`:** en LAN-only docker network usamos `sslmode=disable`. El estándar §4.1 exige `sslmode=require`; este caso es la excepción documentada (red privada interna del cliente, no expuesta a internet). Se documenta en `STACK.md` y `GOTCHAS.md`.

### 8.2 `Caddyfile`

```
:80 {
  handle /api/* {
    reverse_proxy backend:8000
  }
  handle {
    reverse_proxy frontend:3000
  }
}
```

### 8.3 Primer arranque (`make install` o `install.sh` / `install.ps1`)

1. Detecta si existe `.env` — si no, copia de `.env.example` y genera `DB_PASSWORD`, `JWT_SECRET`, `ADMIN_INITIAL_PASSWORD` aleatorios.
2. Pregunta `BUSINESS_NAME` y graba.
3. Corre `docker compose up -d --build`.
4. Espera healthcheck.
5. Backend `entrypoint.sh`:
   - `alembic upgrade head`
   - Si `users` está vacía → crea admin con `ADMIN_INITIAL_PASSWORD` (forzar cambio en primer login).
   - Aplica seeds idempotentes (cliente PG, settings, categorías).
   - Lanza `uvicorn`.
6. Imprime: `✅ POS listo en http://localhost — admin/<password>`.

### 8.4 Backups locales

- Servicio adicional opcional `pos-backup` (no en stack por defecto): cron diario, `pg_dump` a `./backups/`. Se documenta en `README.md` cómo activarlo.
- Restaura con script `restore.sh path/to/backup.sql.gz`.

---

## 9. Estructura de directorios del proyecto

```
POS/
├── PLAN.md                          ← este documento
├── README.md                        ← cómo instalar (cliente final)
├── CLAUDE.md                        ← @import → estándares globales (§24)
├── CONTEXT.md
├── docker-compose.yml
├── Caddyfile
├── .env.example
├── .gitignore
├── memory/
│   ├── STACK.md
│   ├── DECISIONS.md
│   └── GOTCHAS.md
├── mockups/
│   ├── sales.html                    ← incluido en este plan
│   └── catalog.html                  ← incluido en este plan
├── docs/
│   ├── architecture.md
│   ├── api-conventions.md
│   ├── database-schema.md
│   └── user-guide/                   ← se generará en MR
├── scripts/
│   ├── install.sh
│   ├── install.ps1
│   ├── backup.sh
│   ├── restore.sh
│   └── generate_security_report.py
├── backend/
│   ├── Dockerfile
│   ├── entrypoint.sh
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── alembic/
│   │   └── versions/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── security/
│   │   │   ├── jwt.py
│   │   │   ├── password.py
│   │   │   └── permissions.py
│   │   ├── models/                   ← SQLAlchemy
│   │   │   ├── user.py
│   │   │   ├── product.py
│   │   │   ├── customer.py
│   │   │   ├── supplier.py
│   │   │   ├── purchase.py
│   │   │   ├── sale.py
│   │   │   ├── gift_card.py
│   │   │   ├── return_.py
│   │   │   ├── exchange_rate.py
│   │   │   ├── audit_log.py
│   │   │   └── settlement.py
│   │   ├── schemas/                  ← Pydantic
│   │   │   └── (mirror models)
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── products.py
│   │   │   ├── customers.py
│   │   │   ├── suppliers.py
│   │   │   ├── sales.py
│   │   │   ├── purchases.py
│   │   │   ├── consignment.py
│   │   │   ├── gift_cards.py
│   │   │   ├── returns.py
│   │   │   ├── reports.py
│   │   │   ├── settings.py
│   │   │   └── users.py
│   │   ├── services/                 ← lógica de negocio
│   │   │   ├── pricing.py
│   │   │   ├── inventory.py
│   │   │   ├── sales_service.py
│   │   │   ├── purchase_service.py
│   │   │   ├── consignment_service.py
│   │   │   ├── gift_card_service.py
│   │   │   ├── return_service.py
│   │   │   ├── reports_service.py
│   │   │   ├── fx_service.py         ← Banxico + fallback
│   │   │   └── audit_service.py
│   │   ├── dependencies/
│   │   │   ├── auth.py
│   │   │   └── pagination.py
│   │   ├── middleware/
│   │   │   ├── audit.py
│   │   │   ├── rate_limit.py
│   │   │   └── error_handler.py
│   │   └── jobs/
│   │       └── fx_rate_job.py        ← APScheduler
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_sales.py
│   │   ├── test_purchases.py
│   │   ├── test_consignment.py
│   │   ├── test_gift_cards.py
│   │   └── test_reports.py
│   └── seeds/
│       └── seed_initial.py
├── frontend/                         ← (estructura ya descrita en §7.1)
└── .claude/
    ├── settings.json
    ├── commands/                     ← solo si específicos del proyecto
    └── skills/                       ← (ver §10)
```

---

## 10. Skills a cargar

> Se aprovecha el catálogo global ya disponible en `~/.claude/skills/` (estándar §15). Solo copiamos a `<project>/.claude/skills/` aquellos que el usuario solicitó explícitamente que se carguen aquí, o que tengan ajuste 100% específico al proyecto. El resto se referencian por path absoluto.

### 10.1 Solicitados explícitamente — copiar a proyecto

| Skill                                                | Origen              | Destino                                       |
| ---------------------------------------------------- | ------------------- | --------------------------------------------- |
| `brainstorming`                                      | `~/.claude/skills/` | `.claude/skills/brainstorming/`               |
| `writing-plans`                                      | `~/.claude/skills/` | `.claude/skills/writing-plans/`               |
| `executing-plans` (≈"plan-implementation")           | `~/.claude/skills/` | `.claude/skills/executing-plans/`             |
| `polish`                                             | `~/.claude/skills/` | `.claude/skills/polish/`                      |
| `subagent-driven-development`                        | `~/.claude/skills/` | `.claude/skills/subagent-driven-development/` |
| `ui-ux-pro-max`                                      | `~/.claude/skills/` | `.claude/skills/ui-ux-pro-max/`               |
| `react-best-practices` (vercel-react-best-practices) | `~/.claude/skills/` | `.claude/skills/react-best-practices/`        |
| `routing-middleware`                                 | `~/.claude/skills/` | `.claude/skills/routing-middleware/`          |

> **Nota:** "superpowers", "receiving-code-review" y "vercel-composition-patterns" no aparecen en el catálogo de skills global del CLAUDE.md (§15). Cuando ejecutemos en Sonnet 4.6, el primer paso será invocar `find-skills` (skill listado) para localizar/crear estos. Si no existen, los generamos con `skill-creator`.

### 10.2 Necesarios automáticamente (no copiados, referenciados)

| Skill                                                                   | Trigger                         |
| ----------------------------------------------------------------------- | ------------------------------- |
| `systematic-debugging`                                                  | Cualquier bug.                  |
| `test-driven-development`                                               | Antes de cada módulo.           |
| `verification-before-completion`                                        | Antes de marcar tarea completa. |
| `using-git-worktrees`                                                   | Trabajo en paralelo entre olas. |
| `python-best-practices`, `fastapi`, `pydantic`, `alembic`, `sqlalchemy` | Backend.                        |
| `nextjs`, `shadcn`, `turbopack`, `next-cache-components`                | Frontend.                       |
| `docker`, `deployments-cicd`, `env-vars`                                | Empaquetado.                    |
| `auth`                                                                  | Login + JWT + RBAC.             |
| `frontend-design`, `ui-ux-pro-max`, `polish`                            | UI.                             |
| `pdf`                                                                   | Reportes PDF + tickets.         |
| `supabase-postgres-best-practices`                                      | Postgres patterns.              |

### 10.3 Skills propios del proyecto (a crear con `skill-creator`)

- **`pos-domain`** — convenciones de cálculo de divisas, snapshot fx, formato de folios, reglas de inventario, manejo de tarjetas de regalo. Vive en `.claude/skills/pos-domain/SKILL.md`.

---

## 11. Estrategia multi-agente (ejecución en Sonnet 4.6)

> Implementa §20 "Multi-Agent Execution Standard" + §15.8 "Compound Triggers".
> Ejecutar **lote por lote**; cada ola termina antes que arranque la siguiente. Dentro de una ola, todos los agentes corren en paralelo en una sola llamada.

### Ola 0 — Fundaciones (paralelo, 4 agentes)

| Agente               | Alcance                                                                                                                                                                                            | Salida                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **A0-Setup**         | Crea `CLAUDE.md`, `memory/STACK.md`, `memory/DECISIONS.md`, `memory/GOTCHAS.md`, `CONTEXT.md`, `.gitignore`, `README.md`, `.env.example`. Inicializa git.                                          | Archivos meta + `git init` + commit inicial. |
| **A0-Skills**        | Copia los 8 skills del §10.1 desde `~/.claude/skills/` a `.claude/skills/`. Crea skill `pos-domain`.                                                                                               | Carpeta `.claude/skills/` lista.             |
| **A0-Backend-Skel**  | Scaffolding `backend/`: `pyproject.toml`, `Dockerfile`, `entrypoint.sh`, `app/main.py` (hello world), `app/config.py`, `app/database.py`, `alembic.ini`, `alembic/env.py`, primer migration vacía. | Backend levanta `GET /health`.               |
| **A0-Frontend-Skel** | Scaffolding `frontend/`: `npx create-next-app`, Tailwind v4, shadcn init, HeroUI install, `tokens.css` con tema light/dark, `i18n.ts` con strings base es-MX, `Dockerfile` standalone.             | Frontend levanta página vacía con tema.      |

### Ola 1 — Modelos y migraciones (paralelo, 5 agentes — todos tocan archivos distintos)

| Agente                   | Alcance                                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| **A1-Models-Identity**   | `users`, `business_settings`, `audit_logs` — modelos + schemas + migration.                              |
| **A1-Models-Catalog**    | `categories`, `products`, `stock_movements` — modelos + schemas + migration.                             |
| **A1-Models-People**     | `customers`, `suppliers` — modelos + schemas + migration.                                                |
| **A1-Models-Operations** | `purchases`, `purchase_items`, `sales`, `sale_items`, `payments`, `consignment_settlements` — migration. |
| **A1-Models-Extras**     | `gift_cards`, `gift_card_transactions`, `returns`, `return_items`, `exchange_rates` — migration.         |

**Integración (orquestador):** consolidar migraciones en orden (`alembic merge` si conflictan), correr `alembic upgrade head`, smoke test con `pytest tests/test_models.py`.

### Ola 2 — Servicios + routers (paralelo, 6 agentes)

| Agente           | Alcance                                                                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A2-Auth**      | `security/jwt.py`, `security/password.py`, `security/permissions.py`, `routers/auth.py`, `services/audit_service.py`, tests.                          |
| **A2-Catalog**   | `services/inventory.py`, `services/pricing.py`, `routers/products.py`, `routers/customers.py`, `routers/suppliers.py`, tests.                         |
| **A2-Sales**     | `services/sales_service.py`, `services/fx_service.py`, `jobs/fx_rate_job.py`, `routers/sales.py`, tests (incluye flujo multi-divisa multi-payment).   |
| **A2-Purchases** | `services/purchase_service.py`, `services/consignment_service.py`, `routers/purchases.py`, `routers/consignment.py`, tests (workflow draft→approved). |
| **A2-Extras**    | `services/gift_card_service.py`, `services/return_service.py`, `routers/gift_cards.py`, `routers/returns.py`, tests.                                  |
| **A2-Reports**   | `services/reports_service.py`, `routers/reports.py`, generación PDF/XLSX, tests.                                                                      |

**Restricción de concurrencia:** ningún agente toca `app/main.py`; el orquestador hace el `include_router` final.

### Ola 3 — Frontend foundation (paralelo, 4 agentes)

| Agente             | Alcance                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **A3-Layout**      | `app/layout.tsx`, `Sidebar`, `Topbar`, `ThemeToggle`, `FxRateBadge`, `ThemeProvider`.                               |
| **A3-Auth-UI**     | `(auth)/login`, `lib/auth.ts`, `lib/api.ts`, hooks, store de auth.                                                  |
| **A3-DataTable**   | Tabla compartida (HeroUI), `DataTable` genérico con paginación server-side, filtros, búsqueda.                      |
| **A3-i18n-Tokens** | `lib/i18n.ts` completo es-MX, `lib/currency.ts`, `globals.css` con todos los tokens, mocks de Storybook (opcional). |

### Ola 4 — Frontend módulos (paralelo, 6 agentes)

| Agente                     | Alcance                                                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **A4-POS**                 | Pantalla de venta (`/ventas/nueva`) — `ProductSearch`, `Cart`, `PaymentPanel` (multi-divisa multi-método), `CustomerSelector`, `ReceiptDialog`. |
| **A4-Catalog**             | `/productos/*` — listado, alta, edición, miniatura, toggle inventario, tiers de precio.                                                         |
| **A4-Customers-Suppliers** | `/clientes/*`, `/proveedores/*` (incluye campos de consignación).                                                                               |
| **A4-Purchases**           | `/compras/*` + `/compras/consignacion/*` — alta, aprobación, liquidaciones.                                                                     |
| **A4-GiftCards-Returns**   | `/tarjetas-regalo/*`, `/retornos/*` — generación QR, escaneo, devolución → tarjeta.                                                             |
| **A4-Reports-Settings**    | `/reportes/*`, `/configuracion/*` (perfil tema/idioma, negocio, tipo cambio, usuarios).                                                         |

### Ola 5 — Integración + Polish (secuencial)

1. **Orquestador integra Caddy + docker-compose** end-to-end.
2. **Skill `polish`** sobre cada pantalla (alineación, microcopy, estados vacíos, foco accesible).
3. **Skill `verification`**: golden path manual (login → venta efectivo → venta con tarjeta de regalo → compra → aprobación → liquidación → devolución → reportes).
4. `/audit-full` (skill `audit-full`) → PDF.
5. Generación user guide es-MX.

### Reglas de concurrencia

- Archivos compartidos (`app/main.py`, `frontend/src/app/layout.tsx`, `package.json`, `pyproject.toml`, `alembic/env.py`) → **solo el orquestador** los modifica.
- Migraciones → cada agente crea su propio archivo en `alembic/versions/` con timestamp único; orquestador encadena.
- `i18n.ts` → cada agente UI agrega sus claves en bloque etiquetado (comentario `// @module:productos`); orquestador concilia al final.
- Tests → cada agente escribe sus propios `tests/test_<modulo>.py`.

---

## 12. Tests y calidad

**Backend:**

- `pytest --cov` mínimo 75% por módulo.
- Casos golden path + 401 + 403 + 404 + validación inválida.
- Tests específicos: cálculo de divisa, redondeo (Decimal), atomicidad de aprobación de compra (debe revertir todo si falla 1 item), liquidación de consignación (cifras correctas con datos sintéticos), reembolso → tarjeta de regalo balance correcto.

**Frontend:**

- `vitest` para utilidades (`currency.ts`, `permissions.ts`, `i18n.ts`).
- `Playwright` para 3 happy paths: login, venta efectivo, venta con tarjeta de regalo.

**Quality gates** (pre-commit / CI):

- `mypy --strict`, `ruff check`, `ruff format --check`, `pytest`, `pip-audit` (backend).
- `tsc --noEmit`, `eslint`, `vitest run`, `npm audit` (frontend).

---

## 13. Seguridad — checklist v1

- [ ] JWT en cookie HTTP-only `Secure; SameSite=Lax`.
- [ ] bcrypt cost 12; password mínimo 10 chars con regla.
- [ ] Rate limit `/auth/login` 5/min/IP, `/gift-cards/{code}` 30/min/IP.
- [ ] Pydantic en cada body; rechaza campos extra.
- [ ] Logs estructurados (structlog), redact tokens y passwords (§3.3).
- [ ] CORS estricto (sólo el host del frontend).
- [ ] Headers de seguridad (CSP, HSTS, X-Frame-Options=DENY) — vía Caddy.
- [ ] CSP estricto sin `unsafe-inline` (Next.js nonce).
- [ ] No PII en logs (§4.7).
- [ ] Backup script + restore documentado.
- [ ] OpenAPI no expone esquemas en producción si `ENV=production` (opt-out de `/docs`).
- [ ] HMAC en `gift_cards.qr_payload` para prevenir QR forjados.
- [ ] Auditoría: `audit_logs` para cada `sale.create`, `purchase.approve`, `gift_card.issue`, `return.create`, `user.login`, `user.role_change`.

---

## 14. Versionado

Sigue §7. Primera versión: `V2026.05.06-001` (definida en `pyproject.toml`, `package.json`, y `memory/STACK.md`).

---

## 15. Preparación para iOS / Android (v2)

- API REST versionada (`/api/v1`) con OpenAPI publicado en `/api/openapi.json`.
- Auth Bearer Token (mismo flujo que cookie pero sin `Set-Cookie`); endpoint `/auth/mobile-login` que devuelve solo el JSON.
- WebSocket opcional `/ws/realtime` para sincronización inventario / nuevas ventas (placeholder en v1, implementación en v2).
- Endpoint `/sync/since/{timestamp}` que regresa cambios incrementales — útil para offline-first móvil.
- Documentar estos contratos en `docs/api-conventions.md` desde la v1.

---

## 16. Preguntas abiertas / decisiones pendientes (a confirmar antes de ejecutar)

1. **¿Manejo de impuestos?** Asumido: IVA 16% configurable global. ¿Hay productos exentos? Si sí, agregar `products.tax_rate_override`.
2. **¿Series múltiples de folios?** Asumido: una sola serie por tipo (`V-`, `C-`, `D-`, `S-`). ¿Se requieren series por sucursal? (No en v1.)
3. **¿Recibo impreso?** Asumido: PDF descargable + opción de imprimir desde el navegador. ¿Soporte ESC/POS térmico? (Diferido a v1.1 — añade complejidad de drivers.)
4. **¿Banxico API requiere registro?** Sí — el SIE de Banxico ofrece token gratuito. Lo gestionamos en el `.env.example` como `BANXICO_TOKEN` (vacío = usar provider fallback).
5. **¿Foto de producto?** Asumido: subida a `/var/lib/pos/uploads` (volumen Docker). En v2 se moverá a S3 / Spaces.
6. **¿Cancelación de venta libera inventario?** Asumido: sí, si la venta no fue refundada por tarjeta de regalo. Documentar bien para evitar doble retorno.
7. **¿Kardex / valuación?** PEPS / promedio / último costo: usamos **último costo** porque el usuario lo solicitó explícitamente. Ventas vs. costos usa `unit_cost_snapshot`.
8. **¿Multi-caja en LAN?** Cubierto vía conexiones concurrentes; no requiere cambios. Cada cajero tiene su `user_id`.
9. **¿Sesión de caja (cash drawer reconciliation)?** No solicitado en el brief. Se puede agregar en v1.1: tabla `cashier_sessions` con apertura/cierre + arqueo.

---

## 17. Mockups

Dos mockups HTML en `mockups/` (incluidos en este commit del plan):

- **`mockups/sales.html`** — pantalla de venta (POS), tema oscuro, flujo de cobro multi-divisa multi-método.
- **`mockups/catalog.html`** — catálogo de productos, tema claro, vista admin con tiers de precio y toggle de inventario.

Ambos son HTML estático con Tailwind por CDN — sirven como referencia visual para los agentes de la Ola 4.

---

## 18. Definition of Done (v1.0)

- [ ] `docker compose up -d --build` arranca limpio en Win/macOS/Linux con Docker Desktop.
- [ ] Primer login con admin generado, forzar cambio de password.
- [ ] Venta completa con efectivo MXN: < 30 segundos.
- [ ] Venta con USD + tarjeta de regalo: < 60 segundos.
- [ ] Compra normal aprobada → stock actualizado + last_cost actualizado.
- [ ] Compra consignación aprobada → stock + flag is_consigned + supplier.
- [ ] Liquidación de consignación generada con cifras correctas.
- [ ] Devolución → tarjeta de regalo nueva con QR escaneable.
- [ ] 3 reportes funcionando con filtros + export PDF.
- [ ] Tema light/dark persistente por usuario.
- [ ] UI 100% es-MX, código 100% inglés.
- [ ] OpenAPI accesible en `/api/docs` en modo dev.
- [ ] User Guide PDF generado.
- [ ] `/audit-full` PDF generado, score ≥ 80.
- [ ] README con instrucciones para cliente final (3 pasos: instalar Docker, descargar, `make install`).

---

_Fin de la Parte I (plan v1.0)._

---

# PARTE II — Extensiones de producto comercial (configurable / vendible)

> **Contexto:** el POS se distribuirá como producto a múltiples empresas. Cada instalación es un Docker independiente (single-tenant); la primera vez que arranca presenta un wizard que configura identidad, marca, giros, impresoras, licencia y backups. Todo lo configurado se aplica en runtime a la UI (logo, colores, fuente Google).

## §20 Wizard de configuración inicial

### 20.1 Trigger y flujo

```
Al cargar cualquier ruta del frontend:
  GET /api/v1/setup/status
  → { is_completed: false, current_step: 3, completed_steps: [1,2] }
  → frontend redirige TODO el tráfico a /setup/wizard/{N}

Cuando is_completed == true:
  → wizard inaccesible (404). Sólo /configuracion/* permite editar después.
```

Cada paso es un POST atómico. Si el cliente cierra el navegador, regresa al paso pendiente. Sólo el paso 9 marca `is_completed=true`.

### 20.2 Pasos

| #   | Pantalla                   | Datos capturados                                                                                                                                                                                                                   | Endpoint                                     |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | **Bienvenida + idioma**    | `language` (es-MX default)                                                                                                                                                                                                         | `POST /setup/step/1`                         |
| 2   | **Identidad del negocio**  | nombre comercial, razón social, RFC, régimen fiscal, dirección completa, CP, teléfono, email, sitio web                                                                                                                            | `POST /setup/step/2`                         |
| 3   | **Marca**                  | logo claro (PNG/SVG ≤ 1MB), logo oscuro (opcional), favicon, color primario (color picker), color de acento, fuente (combo Google Fonts: Inter, Poppins, Roboto, Montserrat, Lato, Open Sans, Manrope, Plus Jakarta Sans + custom) | `POST /setup/step/3` (multipart)             |
| 4   | **Giros del negocio**      | multi-select de giros (ropa, calzado, joyería, accesorios, marroquinería, cosméticos, papelería, abarrotes, electrónica, servicios, restaurante, general). Cada uno activa atributos dinámicos (ver §23.3).                        | `POST /setup/step/4`                         |
| 5   | **Impuestos y divisa**     | IVA default (16/8/0/exento), divisa base (MXN), divisa secundaria (USD/EUR), proveedor de tipo de cambio (Banxico/exchangerate.host)                                                                                               | `POST /setup/step/5`                         |
| 6   | **Tickets de venta**       | tamaño papel (58/80mm/A4), líneas de encabezado (3 max), líneas de pie (3 max), incluir logo, incluir QR de reseña, mostrar nombre cajero, política de devolución (texto libre), agradecimiento                                    | `POST /setup/step/6`                         |
| 7   | **Facturas (no fiscales)** | activar facturas PDF, datos a mostrar, CFDI fiscal: stub deshabilitado en v1 (placeholder con leyenda "Próximamente: timbrado CFDI 4.0")                                                                                           | `POST /setup/step/7`                         |
| 8   | **Impresoras**             | modo (network/usb/browser), por cada uno: ticket-printer, invoice-printer, kicker de cajón. Detección automática vía Print Bridge (§22).                                                                                           | `POST /setup/step/8`                         |
| 9   | **Licencia + admin**       | modo de licencia (none/offline-key/online-activation), pegar llave (si aplica), crear cuenta admin (override del seed), aceptar términos                                                                                           | `POST /setup/step/9` → `is_completed = true` |

### 20.3 Vista previa en vivo

Pasos 3, 4, 6 incluyen panel derecho con preview en vivo:

- Paso 3: tarjeta de la app con el logo + colores + fuente aplicados.
- Paso 4: ejemplo de formulario "Nuevo Producto" mostrando los campos extras según giros activos.
- Paso 6: render del ticket en HTML que simula 80mm.

---

## §21 Tablas de configuración (DDL)

> Reemplaza la tabla `business_settings` simple de la Parte I. La separación es deliberada: **identidad** (legal) ≠ **marca** (visual) ≠ **operación** (impuestos, tickets) ≠ **integraciones** (impresoras, licencia).

```sql
-- 21.1 Identidad legal y comercial
CREATE TABLE business_identity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_name VARCHAR(150) NOT NULL,         -- nombre comercial (visible)
  legal_name VARCHAR(200) NOT NULL,         -- razón social
  rfc VARCHAR(20),
  fiscal_regime_code VARCHAR(10),           -- '601','612','621', etc.
  fiscal_regime_label VARCHAR(120),
  fiscal_postal_code VARCHAR(10),
  -- Dirección
  address_street VARCHAR(150),
  address_ext_number VARCHAR(20),
  address_int_number VARCHAR(20),
  address_neighborhood VARCHAR(120),
  address_city VARCHAR(100),
  address_state VARCHAR(100),
  address_postal_code VARCHAR(10),
  address_country VARCHAR(80) DEFAULT 'México',
  -- Contacto
  phone VARCHAR(30),
  email VARCHAR(150),
  website VARCHAR(200),
  social_media JSONB,                        -- { facebook, instagram, ... }
  tenant_id UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21.2 Marca visual
CREATE TABLE business_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Imágenes (URLs internas servidas vía /api/v1/uploads/{uuid})
  logo_light_url TEXT,                       -- para fondo claro
  logo_dark_url TEXT,                        -- para fondo oscuro
  logo_print_url TEXT,                       -- B/N de alto contraste para térmica
  favicon_url TEXT,
  app_icon_url TEXT,                         -- para iOS/Android v2
  login_background_url TEXT,
  -- Paleta
  primary_color VARCHAR(9) NOT NULL DEFAULT '#3B82F6',     -- hex con o sin alpha
  primary_color_hover VARCHAR(9),
  accent_color VARCHAR(9),
  -- Tipografía Google Fonts
  font_family_name VARCHAR(80) NOT NULL DEFAULT 'Inter',
  font_family_url TEXT NOT NULL DEFAULT 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  font_weights VARCHAR(40) DEFAULT '400;500;600;700',
  -- Modo
  default_theme VARCHAR(10) DEFAULT 'system' CHECK (default_theme IN ('light','dark','system')),
  tenant_id UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21.3 Giros del negocio (multi-select)
CREATE TABLE business_types_catalog (
  code VARCHAR(40) PRIMARY KEY,               -- 'clothing','jewelry','footwear',...
  name_es VARCHAR(80) NOT NULL,
  description TEXT,
  icon VARCHAR(40)                            -- nombre de Lucide
);

CREATE TABLE business_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_code VARCHAR(40) NOT NULL REFERENCES business_types_catalog(code),
  is_primary BOOLEAN DEFAULT FALSE,
  tenant_id UUID NOT NULL,
  enabled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, type_code)
);

-- 21.4 Atributos dinámicos por giro (semilla del catálogo)
-- Cada giro define qué atributos extra puede tener un producto.
CREATE TABLE product_attribute_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type_code VARCHAR(40) NOT NULL REFERENCES business_types_catalog(code),
  attr_key VARCHAR(40) NOT NULL,              -- 'size','color','material','expiry','batch'
  label_es VARCHAR(80) NOT NULL,
  data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('text','number','date','enum','boolean')),
  enum_values JSONB,                          -- ['XS','S','M','L','XL'] cuando aplica
  is_required BOOLEAN DEFAULT FALSE,
  is_searchable BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  UNIQUE (business_type_code, attr_key)
);

-- Valores guardados en el producto (sparse JSONB)
ALTER TABLE products ADD COLUMN attributes JSONB DEFAULT '{}'::jsonb;
CREATE INDEX idx_products_attributes ON products USING gin (attributes);

-- 21.5 Tickets
CREATE TABLE receipt_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_size VARCHAR(10) NOT NULL DEFAULT '80mm' CHECK (paper_size IN ('58mm','80mm','a4','letter')),
  include_logo BOOLEAN DEFAULT TRUE,
  include_qr_review BOOLEAN DEFAULT FALSE,
  qr_review_url TEXT,
  include_tax_breakdown BOOLEAN DEFAULT TRUE,
  show_cashier_name BOOLEAN DEFAULT TRUE,
  show_customer_name BOOLEAN DEFAULT TRUE,
  show_loyalty_points BOOLEAN DEFAULT TRUE,
  header_lines TEXT[],                        -- max 3 líneas
  footer_lines TEXT[],                        -- max 3 líneas
  thank_you_message VARCHAR(200) DEFAULT '¡Gracias por su compra!',
  return_policy_text TEXT,
  font_size_pt INTEGER DEFAULT 10,
  tenant_id UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21.6 Facturas (PDF no fiscal en v1; CFDI 4.0 en v1.2)
CREATE TABLE invoice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_invoices_enabled BOOLEAN DEFAULT TRUE,
  cfdi_enabled BOOLEAN DEFAULT FALSE,         -- v1.2
  cfdi_pac_provider VARCHAR(20),              -- 'facturama','felmx','finkok'
  cfdi_pac_credentials_encrypted TEXT,        -- AES-GCM con DEK derivada del JWT_SECRET
  cfdi_default_serie VARCHAR(10) DEFAULT 'A',
  cfdi_next_folio INTEGER DEFAULT 1,
  cfdi_certificate_path TEXT,
  invoice_logo_url TEXT,
  invoice_footer_html TEXT,
  default_payment_method_sat VARCHAR(10) DEFAULT '01',  -- '01' efectivo, '04' tarjeta...
  default_use_cfdi VARCHAR(10) DEFAULT 'G03',           -- gastos generales
  tenant_id UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21.7 Impresoras
CREATE TABLE printer_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(20) NOT NULL CHECK (role IN ('ticket','invoice','kitchen','label','cash_drawer')),
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('network_escpos','usb_via_bridge','browser','disabled')),
  -- Network mode
  network_ip INET,
  network_port INTEGER DEFAULT 9100,
  -- USB / Bridge mode
  bridge_printer_id VARCHAR(120),             -- nombre que reporta el Print Bridge
  bridge_url VARCHAR(120) DEFAULT 'http://localhost:9100',
  -- Común
  paper_width_mm INTEGER,
  codepage VARCHAR(20) DEFAULT 'CP850',
  cut_after_print BOOLEAN DEFAULT TRUE,
  open_drawer_on_cash BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  display_name VARCHAR(80),
  tenant_id UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, role, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- 21.8 Auditoría de impresión (debug + reintentos)
CREATE TABLE print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  printer_config_id UUID REFERENCES printer_config(id),
  job_type VARCHAR(20) NOT NULL,              -- 'sale_receipt','invoice','gift_card','session_close'
  reference_type VARCHAR(30),
  reference_id UUID,
  payload_size_bytes INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','printing','succeeded','failed')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  triggered_by UUID REFERENCES users(id),
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 21.9 Estado del wizard
CREATE TABLE setup_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  current_step INTEGER NOT NULL DEFAULT 1,
  completed_steps INTEGER[] DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  tenant_id UUID NOT NULL UNIQUE
);

-- 21.10 Licencia (3 modos: none / offline_key / online_activation)
CREATE TABLE license (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('none','offline_key','online_activation')),
  installation_id UUID NOT NULL DEFAULT gen_random_uuid(),  -- estable por instalación
  -- Offline
  key_payload TEXT,                           -- "<base64-payload>.<base64-signature>" Ed25519
  key_decoded JSONB,                          -- payload parseado: {issued_to, expires_at, features}
  -- Online
  online_endpoint VARCHAR(200),               -- 'https://license.tu-dominio.com/v1/check'
  last_check_at TIMESTAMPTZ,
  last_check_ok BOOLEAN,
  grace_period_days INTEGER DEFAULT 7,
  -- Común
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','grace','expired','invalid')),
  expires_at TIMESTAMPTZ,
  features JSONB DEFAULT '{}'::jsonb,         -- toggles por feature (cfdi:true, multi_branch:false)
  tenant_id UUID NOT NULL,
  activated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 21.11 Catálogo semilla de giros + atributos

```python
# seeds/business_types.py
BUSINESS_TYPES = {
  'clothing':    {'name':'Ropa',           'icon':'shirt'},
  'footwear':    {'name':'Calzado',        'icon':'footprints'},
  'jewelry':     {'name':'Joyería',        'icon':'gem'},
  'accessories': {'name':'Accesorios',     'icon':'watch'},
  'leather':     {'name':'Marroquinería',  'icon':'briefcase'},
  'cosmetics':   {'name':'Cosméticos',     'icon':'sparkles'},
  'stationery':  {'name':'Papelería',      'icon':'pencil'},
  'grocery':     {'name':'Abarrotes',      'icon':'shopping-basket'},
  'electronics': {'name':'Electrónica',    'icon':'cpu'},
  'services':    {'name':'Servicios',      'icon':'wrench'},
  'restaurant':  {'name':'Restaurante',    'icon':'utensils'},
  'general':     {'name':'General',        'icon':'package'},
}

ATTRIBUTES = {
  'clothing':    [('size','Talla','enum',['XS','S','M','L','XL','XXL']), ('color','Color','text'), ('material','Material','text')],
  'footwear':    [('size','Número','enum',['22','23','24','25','26','27','28','29','30']), ('color','Color','text')],
  'jewelry':     [('material','Material','text'), ('weight_g','Peso (g)','number'), ('purity','Pureza','text')],
  'cosmetics':   [('volume_ml','Volumen (ml)','number'), ('expiry_date','Caducidad','date'), ('batch','Lote','text')],
  'grocery':     [('expiry_date','Caducidad','date'), ('batch','Lote','text'), ('barcode_ean','EAN','text')],
  'restaurant':  [('is_dish','Es platillo','boolean'), ('prep_time_min','Tiempo prep (min)','number')],
  'electronics': [('brand','Marca','text'), ('model','Modelo','text'), ('warranty_months','Garantía (meses)','number'), ('serial','Serie','text')],
  # ... etc
}
```

---

## §22 Sistema de impresión (modos A/B/C)

### 22.1 Arquitectura

```
┌──────────────────────────────────────────────────────────────────┐
│  PC del cliente (host)                                            │
│                                                                   │
│  ┌─────────────────┐         ┌──────────────────────────────┐    │
│  │ Print Bridge    │◀───USB──│  Impresora térmica USB        │    │
│  │ daemon          │         │  (Star, Epson, Bixolon...)    │    │
│  │ localhost:9100  │         └──────────────────────────────┘    │
│  └────────┬────────┘                                              │
│           │ HTTP POST                                              │
│           │   /v1/print { printer_id, payload_b64 }                │
│           │                                                        │
│  ┌────────┴───────────────┐                                        │
│  │ Navegador del cajero    │                                        │
│  │ (Chrome / Edge)         │                                        │
│  │                         │                                        │
│  │  ▶ Modo A: backend → TCP:9100 → impresora de red               │
│  │  ▶ Modo B: browser → localhost:9100 (Bridge) → impresora USB   │
│  │  ▶ Modo C: window.print() → diálogo del SO                     │
│  └─────────────────────────┘                                        │
└──────────────────────────────────────────────────────────────────┘
```

### 22.2 Print Bridge — daemon mini (entregable separado)

| Aspecto      | Decisión                                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Lenguaje     | **Python 3.12 + FastAPI** (consistente con backend; empaqueta a binario con PyInstaller)                                          |
| Distribución | Win: `.msi` instalando como Windows Service · macOS: `.pkg` con LaunchAgent · Linux: `.deb` + systemd unit · Sin internet, ~15 MB |
| Repo         | `printbridge/` (subdirectorio del monorepo, build separado)                                                                       |
| Puerto       | `9100` localhost (configurable). Solo escucha en 127.0.0.1                                                                        |
| Auth         | HMAC con shared secret generado en setup wizard (paso 8) y persistido en ambos lados                                              |
| API          | `GET /v1/health` · `GET /v1/printers` (lista USB+spooler) · `POST /v1/print` · `POST /v1/cash-drawer/kick`                        |
| Driver       | `python-escpos` (USB via libusb / Win-USB) + fallback a `win32print`/CUPS para no-térmicas                                        |
| Auto-update  | Misma key Ed25519 que la app; `update.json` polled diariamente                                                                    |
| Logs         | `%PROGRAMDATA%/PrintBridge/logs/` (Win) · `~/Library/Logs/PrintBridge/` (mac) · `/var/log/printbridge/` (Linux)                   |

### 22.3 Renderizado del ticket

- HTML + CSS con `@media print` y `@page { size: 80mm auto }` para modo C.
- Para modos A y B, backend renderiza con **Jinja2 → HTML → captura ESC/POS** (lib `python-escpos` aceptando texto + imagen para el logo).
- Plantilla del ticket lee `receipt_settings` + `business_branding` + `business_identity` + `loyalty_settings`.

### 22.4 Datos siempre presentes en el ticket

```
[logo_print]                         (si include_logo)
[trade_name]
[legal_name] · RFC: [rfc]
[address una línea]
Tel: [phone]
[header_lines]
─────────────────────────────────
Ticket: V-2026-00187    06/05/26 14:32
Cajero: Ana Cordova     Caja 01
Cliente: Público en General
─────────────────────────────────
[items: nombre, cant x precio, importe]
─────────────────────────────────
Subtotal:                  $ 4,232.76
IVA 16%:                     $ 677.24
TOTAL MXN:                 $ 4,910.00
        equivalente USD       281.86
        (T.C. 17.42)
─────────────────────────────────
PAGOS:
  Efectivo MXN              3,000.00
  Efectivo USD 50.00          871.00
  Tarjeta de Regalo GC-AB     1,039.00
  [si tarjeta]: Ref. Term: XXXXXXXXX     ← P10 obligatorio
─────────────────────────────────
[loyalty: si aplica]
  Puntos acumulados: +49
  Puntos disponibles: 218
─────────────────────────────────
[QR de tarjeta de regalo si origen=return]
[footer_lines]
[return_policy_text]
[thank_you_message]
[qr_review si activo]
```

---

## §23 Theming dinámico y atributos por giro

### 23.1 Endpoint público de marca

```
GET /api/v1/branding   (público, cacheable 60s, sin auth)
→ {
    trade_name: "Mi Boutique",
    logo_light_url: "/api/v1/uploads/abc123",
    logo_dark_url: "/api/v1/uploads/def456",
    favicon_url: "/api/v1/uploads/ghi789",
    primary_color: "#3B82F6",
    accent_color: "#22D3EE",
    font_family_name: "Poppins",
    font_family_url: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap",
    default_theme: "system"
  }
```

### 23.2 Aplicación en frontend

```tsx
// app/layout.tsx
const branding = await fetch(`${API}/branding`).then(r => r.json());

// Inyecta CSS variables sobrescribiendo tokens base
<style>{`:root { --accent: ${branding.primary_color}; --accent-hover: ${shadeDark(branding.primary_color)}; }`}</style>
<link rel="icon" href={branding.favicon_url} />
<link rel="stylesheet" href={branding.font_family_url} />
<style>{`html { font-family: '${branding.font_family_name}', 'Inter', system-ui, sans-serif; }`}</style>
```

- ThemeProvider de la Parte I sigue intacto (light/dark por usuario).
- Logo en sidebar y login usa `logo_light_url` / `logo_dark_url` según tema.
- `<title>` y `<meta name="theme-color">` también vienen del endpoint.

### 23.3 Atributos dinámicos en formulario de producto

```
Wizard paso 4 selecciona ['clothing','jewelry'].
  ↓
GET /api/v1/products/attribute-schema
  → [
      { key:'size',   label:'Talla',   type:'enum', values:['XS','S','M','L','XL','XXL'], required:false },
      { key:'color',  label:'Color',   type:'text', required:false },
      { key:'material', label:'Material', type:'text', required:false },
      { key:'weight_g', label:'Peso (g)', type:'number', required:false },
      { key:'purity', label:'Pureza', type:'text', required:false }
    ]
  ↓
Formulario "Nuevo producto" renderiza esos campos extra al final.
Se guardan en products.attributes (jsonb).
```

Las **columnas de la tabla del catálogo** (mockup §17) también pueden mostrar los atributos top (`is_searchable=true`, `display_order` ascendente).

---

## §24 Programa de lealtad / puntos (P14)

### 24.1 Tablas

```sql
CREATE TABLE loyalty_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  -- Acumulación
  accrual_amount_mxn NUMERIC(14,4) DEFAULT 1,    -- por cada $X gastados
  accrual_points NUMERIC(10,2) DEFAULT 1,        -- se otorgan Y puntos
  exclude_categories UUID[],                      -- categorías sin acumular
  exclude_consigned BOOLEAN DEFAULT FALSE,        -- ¿no acumular en consignación?
  -- Redención
  redemption_min_points NUMERIC(10,2) DEFAULT 100,
  redemption_points_value_mxn NUMERIC(14,4) DEFAULT 1,  -- 1 punto = $1
  redemption_max_pct_of_sale NUMERIC(5,4) DEFAULT 0.5,  -- máx 50% del total
  -- Expiración
  expiration_months INTEGER DEFAULT 12,           -- 0 = nunca
  -- UX
  display_on_receipt BOOLEAN DEFAULT TRUE,
  tenant_id UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE customers ADD COLUMN points_balance NUMERIC(10,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN points_lifetime_earned NUMERIC(10,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN points_lifetime_redeemed NUMERIC(10,2) DEFAULT 0;

CREATE TABLE points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN
    ('earn','redeem','adjust','expire','reverse')),
  points NUMERIC(10,2) NOT NULL,                 -- + o − según tipo
  balance_after NUMERIC(10,2) NOT NULL,
  sale_id UUID REFERENCES sales(id),
  return_id UUID REFERENCES returns(id),
  expires_at TIMESTAMPTZ,                         -- usado solo en 'earn'
  notes TEXT,
  actor_id UUID REFERENCES users(id),
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_points_tx_customer ON points_transactions(customer_id, created_at DESC);
```

### 24.2 Lógica al cobrar venta

```
Si customer != default (público en general) Y loyalty_settings.is_active:

  earn_points = floor(total_after_redemption_mxn / accrual_amount_mxn) * accrual_points

  INSERT points_transactions (earn, +earn_points, expires_at = NOW() + months)
  UPDATE customers SET
    points_balance = points_balance + earn_points,
    points_lifetime_earned = points_lifetime_earned + earn_points
```

### 24.3 Redención como método de pago

En el panel de pagos del POS aparece **"Puntos de lealtad"** cuando customer != default y balance ≥ min:

```
Cliente: María González   Puntos: 218
─────────────────────────────────────
[ Aplicar puntos: ___ pts (= $___) ]   límite 50% del total
```

Se guarda como `payment.method = 'loyalty_points'` con `amount_in_mxn = points * redemption_points_value_mxn`.

### 24.4 Job de expiración

APScheduler corre `expire_loyalty_points` 1×/día a las 02:00:

- Busca `points_transactions` tipo 'earn' con `expires_at < NOW()` no compensados.
- Inserta tipo 'expire' por la diferencia, ajusta `customers.points_balance`.

---

## §25 Sesión de caja / arqueo (P9)

### 25.1 Tablas

```sql
CREATE TABLE cashier_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID NOT NULL REFERENCES users(id),
  workstation_name VARCHAR(80),
  -- Apertura
  opening_balance_mxn NUMERIC(14,4) NOT NULL,
  opening_notes TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Cierre
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','reconciled')),
  closing_balance_counted_mxn NUMERIC(14,4),
  closing_balance_expected_mxn NUMERIC(14,4),     -- calculado
  closing_difference_mxn NUMERIC(14,4),           -- counted - expected (puede ser negativo)
  closing_notes TEXT,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES users(id),
  reconciled_by UUID REFERENCES users(id),
  reconciled_at TIMESTAMPTZ,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sessions_cashier_open ON cashier_sessions(cashier_id) WHERE status = 'open';

-- Cada sale se ata a una sesión abierta
ALTER TABLE sales ADD COLUMN cashier_session_id UUID REFERENCES cashier_sessions(id);
```

### 25.2 Flujo

```
Login del cajero:
  if no hay sesión abierta del cajero:
    pantalla "Apertura de caja" → captura fondo inicial efectivo MXN
    POST /sessions/open → registra fila

Operación normal:
  toda sale registrada se ata a session_id

Botón "Cerrar caja" (sidebar):
  Sistema calcula closing_balance_expected:
    opening + sum(payments efectivo MXN) + sum(USD * fx en MXN)
                                         - sum(cambios entregados)
                                         - sum(retiros si los hay)
  Cajero captura conteo físico MXN + USD
  difference = counted - expected
  if abs(difference) > umbral_alerta:
    requiere autorización supervisor
  POST /sessions/{id}/close → genera reporte arqueo PDF
```

### 25.3 Reporte de arqueo

PDF con: encabezado del negocio, cajero, periodo, ventas totales, desglose por método de pago, USD recibido, esperado vs. contado, diferencia, firma del cajero + supervisor.

---

## §26 Licenciamiento y modelo de distribución (P5: 3 modos)

### 26.1 Modos

| Modo                  | Cuándo usarlo                                           | Validación                                                                                                                             |
| --------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **none**              | Demo, instalación interna del propio dueño del producto | Siempre activo. Telemetría obligatoria opt-out.                                                                                        |
| **offline_key**       | Cliente comprado one-shot, sin internet garantizado     | Llave Ed25519 firmada por tu llave privada; pública embebida en la app valida en cada arranque + cada 24h.                             |
| **online_activation** | Cliente con internet + contrato recurrente / SaaS-like  | App llama a `https://license.tu-dominio.com/v1/check` 1×/día con `installation_id` + HMAC. Tolerancia offline = 7 días (grace period). |

### 26.2 Llave offline (formato)

```
<base64url(payload)>.<base64url(signature)>

payload (JSON):
{
  "v": 1,
  "installation_id": "uuid (opcional, vacío = transferible)",
  "issued_to": "Boutique Carolina, S.A. de C.V.",
  "issued_at": "2026-05-06T10:00:00Z",
  "expires_at": "2027-05-06T00:00:00Z",
  "features": {
    "cfdi": true,
    "cashier_sessions": true,
    "loyalty": true,
    "max_users": 10,
    "max_products": 5000
  },
  "issuer": "ardepa-pos"
}

signature = Ed25519(privKey, payload_bytes)
```

App embebe `pubkey` (32 bytes hex). Validación: parsea payload, verifica firma, chequea `expires_at`, aplica `features` como toggles.

### 26.3 Servidor de licencias (entregable separado v1.1)

- Mini servicio FastAPI + Postgres en tu Hostinger.
- Tabla `licenses`: id, customer_name, installation_id, mode, key_payload, expires_at, last_check_at, status.
- Endpoint `/v1/check` valida HMAC + responde `{valid, expires_at, features}`.
- Panel admin para emitir / revocar / extender.
- En v1 puede no existir aún — los clientes con `online_activation` vienen en v1.1.

### 26.4 Empaque y entrega al cliente final

Estructura del ZIP que envías al cliente:

```
mi-boutique-pos-v2026.05.06-001.zip
├── README.txt                    ← 5 pasos en español
├── docker-compose.yml
├── .env.example
├── install.ps1                   ← Windows
├── install.sh                    ← macOS/Linux
├── update.sh
├── backup.sh
├── restore.sh
├── printbridge/
│   ├── PrintBridge-Setup.msi     ← Win
│   ├── PrintBridge.pkg            ← macOS
│   └── printbridge_linux.tar.gz
└── docs/
    ├── manual-instalacion.pdf
    └── manual-usuario.pdf
```

Cliente: descomprime → corre `install.ps1` (o `.sh`) → docker tira imágenes desde tu **registry privado de GitLab** (autenticado con un token de solo-lectura embebido en `install.ps1` por instalación) → primer arranque → wizard.

> **Decisión:** las imágenes Docker NO se distribuyen como tarballs sino que se hospedan en tu Container Registry privado, lo cual permite parches rápidos y evita que el cliente tenga 1.5 GB de archivos. El token embebido es de **read-only-pull**, sin acceso a code.

---

## §27 Soporte, telemetría y backups (P15, P8)

### 27.1 Botón de soporte (WhatsApp)

```sql
ALTER TABLE business_branding ADD COLUMN support_whatsapp_number VARCHAR(20);
ALTER TABLE business_branding ADD COLUMN support_email VARCHAR(120);
ALTER TABLE business_branding ADD COLUMN support_label_es VARCHAR(60) DEFAULT 'Soporte técnico';
```

Sidebar inferior muestra botón "Soporte" → `https://wa.me/{number}?text=Hola, soy {trade_name}, instalación {installation_id_corto}, mi versión es {version}`. Pre-rellena el contexto.

### 27.2 Telemetría opt-in

```sql
CREATE TABLE telemetry_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN DEFAULT FALSE,
  endpoint_url VARCHAR(200),                 -- 'https://telemetry.tu-dominio.com/v1/ingest'
  shared_secret VARCHAR(80),
  last_sent_at TIMESTAMPTZ,
  tenant_id UUID NOT NULL
);
```

Si activado, job semanal envía:

```json
{
  "installation_id": "...",
  "version": "V2026.05.06-001",
  "uptime_days": 47,
  "users_active_30d": 3,
  "sales_count_30d": 1240,
  "errors_count_7d": 2,
  "license_mode": "offline_key",
  "license_expires_in_days": 234
}
```

Sin PII de clientes, sin contenido de ventas. Sólo agregados.

### 27.3 Backups (P8: local + Drive opcional)

```sql
CREATE TABLE backup_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_enabled BOOLEAN DEFAULT TRUE,
  local_retention_days INTEGER DEFAULT 14,
  local_path VARCHAR(200) DEFAULT '/var/lib/pos/backups',
  drive_enabled BOOLEAN DEFAULT FALSE,
  drive_oauth_refresh_token TEXT,            -- encriptado AES-GCM
  drive_folder_id VARCHAR(120),
  schedule_cron VARCHAR(40) DEFAULT '0 3 * * *',
  last_backup_at TIMESTAMPTZ,
  last_backup_size_bytes BIGINT,
  last_backup_status VARCHAR(20),
  tenant_id UUID NOT NULL
);
```

Job APScheduler:

1. `pg_dump --format=custom` → `backup-YYYYMMDD-HHmm.dump`
2. gzip
3. Mueve a `local_path` (volumen Docker)
4. Si `drive_enabled`: sube vía Google Drive API
5. Purga > `local_retention_days`

Pantalla `/configuracion/backups` muestra historial, permite "Backup ahora" y "Restaurar" (sube archivo, confirma con admin password, ejecuta `restore.sh` interno).

---

## §28 API extendida (endpoints nuevos sobre Parte I §6)

```
# Setup wizard (sin auth si is_completed == false)
GET    /setup/status
POST   /setup/step/{n}
POST   /setup/complete

# Branding (público)
GET    /branding
GET    /uploads/{uuid}                    (imágenes con cache headers)

# Configuración (admin)
GET    /settings/branding
PATCH  /settings/branding                 (multipart si imágenes)
GET    /settings/identity
PATCH  /settings/identity
GET    /settings/business-types
PUT    /settings/business-types           (replace set)
GET    /settings/receipt
PATCH  /settings/receipt
GET    /settings/invoice
PATCH  /settings/invoice
GET    /settings/printers
POST   /settings/printers
PATCH  /settings/printers/{id}
DELETE /settings/printers/{id}
POST   /settings/printers/{id}/test       imprime ticket de prueba

# Atributos dinámicos
GET    /products/attribute-schema         según business_types activos

# Lealtad
GET    /loyalty/settings
PATCH  /loyalty/settings
GET    /customers/{id}/points
GET    /customers/{id}/points-history
POST   /customers/{id}/points/adjust      admin

# Sesiones de caja
POST   /sessions/open                     { opening_balance }
GET    /sessions/current
POST   /sessions/{id}/close               { counted_balance_mxn, counted_balance_usd, notes }
GET    /sessions                         ?cashier=&from=&to=
GET    /sessions/{id}/report              PDF arqueo

# Licencia
GET    /license/status
POST   /license/activate-offline          { key_payload }
POST   /license/check-online              fuerza chequeo

# Backups
GET    /backups/settings
PATCH  /backups/settings
GET    /backups
POST   /backups/now
POST   /backups/{id}/restore              cuidado — admin + confirm

# Print Bridge proxy (sólo health/discover, no datos)
GET    /printers/discover                 hace pasarela a localhost:9100/v1/printers
```

### 28.1 Modificación al schema de pagos (P10)

```sql
ALTER TABLE payments
  ADD COLUMN terminal_reference VARCHAR(40),
  ADD COLUMN terminal_authorization VARCHAR(20),
  ADD COLUMN terminal_brand VARCHAR(20),     -- 'visa','mastercard','amex','clip','mp_point'
  ADD CONSTRAINT chk_card_reference CHECK (
    method NOT IN ('credit_card','debit_card')
    OR (terminal_reference IS NOT NULL AND length(terminal_reference) >= 4)
  );
```

UI del POS: cuando cajero selecciona "Tarjeta crédito/débito" como método, modal **bloquea** continuar sin capturar:

- Referencia (impresa en ticket de la terminal bancaria) — obligatoria, mínimo 4 caracteres.
- Autorización — opcional pero recomendada.
- Últimos 4 dígitos — opcional.

El ticket impreso muestra `Ref. Term: XXXXXXXXX`.

---

## §29 Multi-agente — olas adicionales sobre Parte I §11

> Las olas 0–5 originales se mantienen. Estas nuevas se intercalan o se anexan según dependencia.

### Ola 0 — añadir 2 agentes más (paralelo)

| Agente                  | Alcance                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **A0-PrintBridge-Skel** | Repo `printbridge/` con FastAPI base, descubrimiento de impresoras, endpoint `/v1/health`, packaging script PyInstaller (Win/macOS/Linux).  |
| **A0-License-Lib**      | Módulo `app/security/license.py` con: generación de Ed25519 key, parseo + validación de payload, helpers para los 3 modos. Tests unitarios. |

### Ola 1 — añadir 1 agente más (paralelo)

| Agente               | Alcance                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **A1-Models-Config** | Tablas §21 (todas) + §24 loyalty + §25 cashier_sessions + alteración payments §28.1 + seeds business_types_catalog + product_attribute_defs. |

### Ola 2 — añadir 2 agentes (paralelo)

| Agente                  | Alcance                                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A2-Setup-Wizard-API** | `services/setup_service.py`, `routers/setup.py`, validaciones Pydantic por paso, upload de imágenes a `/var/lib/pos/uploads`, hash + redimensionado de logos para cada uso (light/dark/print). |
| **A2-Loyalty-Sessions** | `services/loyalty_service.py`, `services/session_service.py`, integración en `sales_service.py` (auto-accrual, attach a session), routers correspondientes, tests.                             |

### Ola 3.5 — Frontend setup wizard (paralelo, 4 agentes — entre Ola 3 y 4)

| Agente                    | Alcance                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **A3.5-Wizard-Shell**     | Layout del wizard, stepper, persistencia local de progreso, redirección global cuando `is_completed=false`. |
| **A3.5-Wizard-Steps-1-4** | Pasos bienvenida, identidad, marca (con preview), giros.                                                    |
| **A3.5-Wizard-Steps-5-8** | Pasos impuestos, ticket, factura, impresoras (con detección Print Bridge).                                  |
| **A3.5-Wizard-Step-9**    | Paso licencia + creación admin + finalización.                                                              |

### Ola 4 — añadir 2 agentes (paralelo)

| Agente                 | Alcance                                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A4-Settings-UI**     | Toda la sección `/configuracion/*` corriendo: branding, identidad, giros, ticket, factura, impresoras (con botón "Imprimir prueba"), backups, lealtad, licencia. |
| **A4-Theming-Runtime** | Hook `useBranding`, inyección de CSS vars, carga dinámica de Google Fonts, ThemeProvider extendido, atributos dinámicos en formulario de producto.               |

### Ola 5 — Print Bridge final + integración

- A0-PrintBridge-Skel madura: drivers ESC/POS para Star/Epson/Bixolon, instaladores firmados (Windows code-sign opcional), tests E2E con impresora física.
- Integración con backend: helpers `print_receipt(sale_id)`, `print_invoice(invoice_id)`, `kick_drawer()`.

---

## §30 Mockups (actualizado)

Carpeta `mockups/`:

| Archivo                | Estado      | Tema  | Pantalla                                                |
| ---------------------- | ----------- | ----- | ------------------------------------------------------- |
| `sales.html`           | ✅ Parte I  | Dark  | POS — pantalla de cobro multi-divisa multi-pago         |
| `catalog.html`         | ✅ Parte I  | Light | Catálogo de productos con tiers de precio               |
| `wizard-branding.html` | ✅ Parte II | Light | Wizard paso 3 — marca con preview en vivo               |
| `settings.html`        | ✅ Parte II | Light | Configuración corriendo — sección impresoras + branding |

---

## §31 Decisiones cerradas + nuevas preguntas abiertas

### 31.1 Cerradas en esta iteración

✅ P1 single-tenant per install · ✅ P2 los 3 modos con USB primario (Print Bridge real) · ✅ P3 sin CFDI fiscal en v1, adaptador listo · ✅ P4 giros multi-select con atributos dinámicos · ✅ P5 los 3 modos de licencia · ✅ P6 update opt-in · ✅ P7 una instalación = una sucursal · ✅ P8 local + Drive · ✅ P9 sesiones de caja · ✅ P10 referencia bancaria obligatoria · ✅ P14 lealtad con puntos · ✅ P15 WhatsApp + telemetría opt-in.

### 31.2 Decisiones cerradas Q1-Q7 (confirmadas 2026-05-06)

✅ **Q1 — Print Bridge sin code-signing en v1.** Manual de instalación incluye sección "Cómo permitir el ejecutable en Windows SmartScreen / Gatekeeper macOS". Firmar en v1.1 cuando haya tracción comercial (~10 instalaciones).

✅ **Q2 — GitLab Container Registry personal.** Imágenes en `registry.gitlab.com/<usuario-personal>/pos-{backend,frontend}:<branch>-<sha>`. Token read-only-pull embebido en `install.ps1`/`install.sh` por instalación.

✅ **Q3 — Logo 1024×1024 max upload, 4 versiones auto-generadas server-side** con `Pillow`:

- `logo_full` — original (cap 1024×1024).
- `logo_sidebar` — 200×200, fondo transparente.
- `logo_login` — 400×400.
- `logo_print` — 384px ancho, B/N alto contraste, dithering Floyd-Steinberg para térmica 80mm (192px para 58mm).

✅ **Q4 — Llave transferible.** `installation_id` en payload es opcional (null = transferible). Servidor de licencias (v1.1) registra `last_check_at` por instalación; si una llave aparece en >2 instalaciones simultáneas activas en 24h, marcamos warning interno (no bloqueo automático).

✅ **Q5 — Manuales 100% es-MX**, generados con `reportlab` desde plantillas en `docs/manuals/`. Dos PDFs:

- `manual-instalacion.pdf` — para el técnico (5 pasos: Docker, descarga, install.sh, wizard, Print Bridge).
- `manual-usuario.pdf` — para cajeros y admin (referencia operativa por módulo, atajos, FAQ).

✅ **Q6 — Modo demo activable.** `.env` flag `DEMO_MODE=true` ejecuta `seeds/demo_data.py` después de migraciones:

- 50 productos distribuidos en los 12 giros del catálogo.
- 20 clientes con saldos de puntos variados.
- 5 proveedores (3 normales + 2 consignación).
- 100 ventas históricas en los últimos 30 días con métodos de pago variados.
- 3 tarjetas de regalo activas con saldo.
- Banner persistente amarillo en topbar: **"Modo demostración — los datos no son reales"**.
- Comando `make demo-reset` para regenerar.

✅ **Q7 — Print Bridge auto-update independiente.** Daemon polea `https://updates.tu-dominio.com/printbridge/version.json` cada 24h. Si app detecta `bridge.version < min_required_version`, banner amarillo en `/configuracion/impresoras` con botón "Actualizar Print Bridge" → instrucciones según OS. La venta nunca se bloquea — siempre cae a modo C (browser dialog) como fallback.

---

## §32 Definition of Done — extensión

Sobre el DoD original de Parte I §18, agregar:

- [ ] Wizard completable en < 5 minutos por un admin sin documentación.
- [ ] Logo y colores del wizard visibles en login + sidebar + ticket impreso de prueba.
- [ ] Cambiar de fuente Google Font en `/configuracion/branding` actualiza la UI sin recargar manual del cajero (solo Ctrl+R).
- [ ] Seleccionar giro "Ropa" + "Joyería" muestra campos talla/color/material/peso/pureza al crear producto nuevo.
- [ ] Pago con tarjeta sin capturar referencia → bloqueado con error claro.
- [ ] Print Bridge instalado en Windows imprime ticket de prueba desde `/configuracion/impresoras`.
- [ ] Llave de licencia offline expirada → app muestra banner rojo + bloquea ventas nuevas (permite consultar histórico).
- [ ] Apertura de sesión obligatoria al login del cajero; cierre con conteo físico.
- [ ] Backup automático corre cada noche en demo VM y queda archivo en `/var/lib/pos/backups`.
- [ ] Cliente con > min_points puede redimir hasta 50% del total de venta como pago.
- [ ] Botón "Soporte" abre WhatsApp con número configurado y contexto pre-rellenado.

---

_Plan v1.2 — **CONGELADO** y listo para ejecución._
_Todas las decisiones Q1–Q7 cerradas el 2026-05-06._
_Próximo paso: cambiar a Sonnet 4.6 y arrancar **Ola 0 con 6 agentes paralelos** (meta + skills + scaffold backend + scaffold frontend + Print Bridge skeleton + License Lib)._
