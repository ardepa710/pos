# Discovery Report — Rebrand Kolekto v1.0

**Fecha:** 2026-05-08 | **Rama:** feat/rebrand-kolekto-v1 | **Agentes:** 4 paralelos

---

## ESTADO ACTUAL DEL STACK

| Capa          | Tecnología                                                              | Relevancia al rebrand                                  |
| ------------- | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| CSS           | Tailwind v4 + PostCSS (`@import "tailwindcss"`)                         | Sin `tailwind.config.ts` — tokens van en `globals.css` |
| Tokens        | `globals.css` con CSS custom properties (`--bg-base`, `--accent`, etc.) | **Reemplazo completo de valores**                      |
| Token source  | `design-tokens.ts` en raíz (ya existe, ya es Kolekto)                   | Mover a `frontend/src/lib/`                            |
| Componentes   | HeroUI + Lucide React + framer-motion                                   | Sin custom icons — solo PNG externos                   |
| i18n          | `frontend/src/lib/i18n.ts` (~100 strings)                               | Hub central de copy                                    |
| Assets        | 17 PNG en `/public/` (raíz) — YA son Kolekto                            | Mover a `frontend/public/`                             |
| Next.js icons | **No implementados** — ni `app/icon.tsx` ni `favicon.ico` en frontend   | Agregar metadatos de favicon                           |
| Logo          | **Dinámico vía DB** — `business_settings.logo_url`                      | Fallbacks en código necesitan Kolekto                  |

---

## AGENT A — Archivos de estilos

| Archivo                        | Líneas | Contenido                                                                         |
| ------------------------------ | ------ | --------------------------------------------------------------------------------- |
| `frontend/src/app/globals.css` | 138    | **ÚNICO** archivo CSS. CSS vars light + dark theme. Tailwind import. Base styles. |
| `frontend/postcss.config.mjs`  | 6      | `@tailwindcss/postcss` — sin cambios necesarios                                   |
| `frontend/src/lib/utils.ts`    | ~5     | Función `cn()` — sin cambios                                                      |
| `design-tokens.ts` (raíz)      | 220    | ✅ Ya es Kolekto Verde Olivo — mover a `frontend/src/lib/`                        |

**Sin archivos:** `tailwind.config.ts`, `.scss`, `.less`, archivos `theme.*`, `tokens.*`

---

## AGENT B — Colores hardcodeados y strings de marca

### Variables CSS actuales → valores Kolekto requeridos

#### Light theme (`:root`)

| Variable actual            | Valor actual             | Valor Kolekto            | Token                                  |
| -------------------------- | ------------------------ | ------------------------ | -------------------------------------- |
| `--bg-base`                | `#f8fafc`                | `#F5F1EA`                | `color.light.bg`                       |
| `--bg-card`                | `#ffffff`                | `#FFFFFF`                | `color.light.surface` (sin cambio)     |
| `--bg-card-elevated`       | `#f1f5f9`                | `#F0F0E5`                | `color.light.surfaceSubtle`            |
| `--bg-input`               | `#ffffff`                | `#FFFFFF`                | sin cambio                             |
| `--bg-sidebar`             | `#1e293b`                | `#1A1A1A`                | `color.light.text` (sidebar usa tinta) |
| `--bg-sidebar-item`        | `rgba(255,255,255,0.05)` | `rgba(255,255,255,0.05)` | sin cambio                             |
| `--bg-sidebar-active`      | `rgba(59,130,246,0.15)`  | `rgba(107,122,63,0.15)`  | olivo 15%                              |
| `--border`                 | `#e2e8f0`                | `#E8E2D5`                | `color.light.border`                   |
| `--border-focus`           | `#3b82f6`                | `#6B7A3F`                | `color.light.accent`                   |
| `--border-strong`          | `#cbd5e1`                | `#D8D2C4`                | `color.light.borderStrong`             |
| `--text-primary`           | `#0f172a`                | `#1A1A1A`                | `color.light.text`                     |
| `--text-secondary`         | `#475569`                | `#3D4326`                | `color.light.textSecondary`            |
| `--text-muted`             | `#94a3b8`                | `#8C8478`                | `color.light.textMuted`                |
| `--text-on-dark`           | `#f1f5f9`                | `#F5F1EA`                | `color.light.textInverse`              |
| `--text-on-sidebar`        | `#cbd5e1`                | `#E8E2D5`                | `color.dark.text` (crema)              |
| `--text-on-sidebar-active` | `#ffffff`                | `#FFFFFF`                | sin cambio                             |
| `--accent`                 | `#3b82f6`                | `#6B7A3F`                | `color.light.accent`                   |
| `--accent-hover`           | `#2563eb`                | `#5A6835`                | `color.light.accentHover`              |
| `--accent-subtle`          | `rgba(59,130,246,0.1)`   | `rgba(107,122,63,0.1)`   | olivo 10%                              |
| `--accent-foreground`      | `#ffffff`                | `#FFFFFF`                | sin cambio                             |
| `--success`                | `#22c55e`                | `#6B7A3F`                | reusa olivo                            |
| `--success-subtle`         | `rgba(34,197,94,0.1)`    | `rgba(107,122,63,0.1)`   |                                        |
| `--warning`                | `#f59e0b`                | `#C49A3F`                | `color.light.warning`                  |
| `--warning-subtle`         | `rgba(245,158,11,0.1)`   | `rgba(196,154,63,0.1)`   |                                        |
| `--error`                  | `#ef4444`                | `#A04540`                | `color.light.error`                    |
| `--error-subtle`           | `rgba(239,68,68,0.1)`    | `rgba(160,69,64,0.1)`    |                                        |
| `--info`                   | `#3b82f6`                | `#4A6B7A`                | `color.light.info`                     |
| `--info-subtle`            | `rgba(59,130,246,0.1)`   | `rgba(74,107,122,0.1)`   |                                        |
| `--cart-bg`                | `#f8fafc`                | `#F5F1EA`                | = `--bg-base`                          |
| `--product-card-bg`        | `#ffffff`                | `#FFFFFF`                | sin cambio                             |
| `--payment-panel-bg`       | `#f1f5f9`                | `#F0F0E5`                | = `--bg-card-elevated`                 |
| `--receipt-bg`             | `#ffffff`                | `#FFFFFF`                | sin cambio                             |
| `.demo-banner` background  | `#f59e0b`                | `#C49A3F`                | `color.light.warning`                  |

#### Dark theme (`.dark`)

| Variable actual            | Valor actual            | Valor Kolekto           |
| -------------------------- | ----------------------- | ----------------------- |
| `--bg-base`                | `#0f172a`               | `#14150F`               |
| `--bg-card`                | `#1e293b`               | `#1F2018`               |
| `--bg-card-elevated`       | `#293548`               | `#2A2C24`               |
| `--bg-input`               | `#1e293b`               | `#1F2018`               |
| `--bg-sidebar`             | `#0d1829`               | `#14150F`               |
| `--border`                 | `#334155`               | `#2A2C24`               |
| `--border-focus`           | `#3b82f6`               | `#A4B364` ← olivo claro |
| `--border-strong`          | `#475569`               | `#3D3E33`               |
| `--text-primary`           | `#f1f5f9`               | `#E8E2D5`               |
| `--text-secondary`         | `#94a3b8`               | `#A4B364`               |
| `--text-muted`             | `#64748b`               | `#6B665C`               |
| `--cart-bg`                | `#1a2535`               | `#14150F`               |
| `--product-card-bg`        | `#1e293b`               | `#1F2018`               |
| `--payment-panel-bg`       | `#162032`               | `#2A2C24`               |
| `--receipt-bg`             | `#1e293b`               | `#1F2018`               |
| _(nuevo)_ `--accent`       | _(no definido en dark)_ | `#A4B364` ← AGREGAR     |
| _(nuevo)_ `--accent-hover` | _(no definido en dark)_ | `#B4C374` ← AGREGAR     |

### Strings de marca hardcodeados a cambiar

| Archivo                                                     | Línea             | Valor actual                                   | Valor Kolekto                              |
| ----------------------------------------------------------- | ----------------- | ---------------------------------------------- | ------------------------------------------ |
| `frontend/src/app/layout.tsx`                               | 13-14             | `title: "POS"` / `"Sistema de Punto de Venta"` | `"Kolekto"` / `"Tu colectivo, conectado."` |
| `frontend/package.json`                                     | 2                 | `"pos-frontend"`                               | `"kolekto-frontend"`                       |
| `frontend/src/app/(auth)/login/page.tsx`                    | 77                | `?? "Punto de Venta"`                          | `?? "Kolekto"`                             |
| `frontend/src/app/(auth)/setup/page.tsx`                    | 163               | `"Ir al Punto de Venta"`                       | `"Ir a Kolekto"`                           |
| `frontend/src/components/layout/AppShell.tsx`               | múltiples         | `?? "POS"`                                     | `?? "Kolekto"`                             |
| `frontend/src/components/layout/Sidebar.tsx`                | múltiples         | `?? "POS"`                                     | `?? "Kolekto"`                             |
| `frontend/src/components/settings/BusinessSettingsForm.tsx` | 63,76,102,183,192 | `"#3b82f6"` (6 ocurrencias)                    | `"#6B7A3F"`                                |
| `backend/app/main.py`                                       | 43                | `title="POS API"`                              | `title="Kolekto API"`                      |
| `README.md`                                                 | 1,3               | `POS — Punto de Venta`                         | `Kolekto — Tu colectivo, conectado.`       |

### NO cambiar (decisión deliberada)

- `frontend/src/lib/i18n.ts` → `pos: "Punto de Venta"` — label funcional del módulo POS, no marca
- Docker container names (`pos-backend`, `pos-frontend`) — infraestructura, no branding
- Log prefixes (`pos.backend.startup`) — romperían parsing de logs existentes
- Nombres de env vars (`BUSINESS_NAME`, etc.) — API pública, retrocompatibilidad
- `backend/app/config.py` → `business_name: "Mi Negocio"` — configurable por usuario

---

## AGENT C — Assets visuales

### `/public/` (raíz del proyecto — UNTRACKED, ya son Kolekto)

| Archivo                     | Dimensiones | Uso                       |
| --------------------------- | ----------- | ------------------------- |
| `logo-horizontal.png`       | 1024×264    | Logo principal horizontal |
| `logo-vertical.png`         | 943×1024    | Logo vertical             |
| `logo-inverso.png`          | 1024×309    | Logo sobre fondo oscuro   |
| `logo-monocromo.png`        | 1024×264    | Logo monocromo            |
| `isotipo.png`               | 1015×1024   | Solo el símbolo           |
| `brand-guide.png`           | 768×1024    | Guía de marca             |
| `sticker.png`               | 1024×1024   | Sticker                   |
| `favicon-16.png`            | 1015×1024   | Favicon 16px              |
| `favicon-32.png`            | 1015×1024   | Favicon 32px              |
| `favicon-48.png`            | 1015×1024   | Favicon 48px              |
| `post-facebook-teaser.png`  | 1200×630    | OG image                  |
| `post-instagram-teaser.png` | 1080×1080   | Instagram                 |
| `splash-movil.png`          | 474×1024    | Splash móvil              |
| `mockup-pos.png`            | 1024×640    | Mockup                    |
| `etiqueta-colgante.png`     | 1024×513    | Colateral                 |
| `tarjeta-anverso.png`       | 1024×586    | Tarjeta frente            |
| `tarjeta-reverso.png`       | 1024×586    | Tarjeta reverso           |

**Acción:** Mover a `frontend/public/` (Next.js sirve desde ahí).

### `frontend/public/` — VACÍO (solo `.gitkeep`)

Sin assets actuales.

### Next.js App Router icons — NO IMPLEMENTADOS

Agregar en `frontend/src/app/`:

- `icon.png` — sirve como `/favicon.ico` automáticamente
- `apple-icon.png` — apple-touch-icon
- `opengraph-image.png` — og:image

### Logos en código — dinámicos vía DB

El branding actual usa URLs almacenadas en `business_settings.logo_url`.
Los componentes renderizan `<img src={logoUrl}>` con fallback al ícono `Store` de Lucide.
**Acción:** Crear `<KolektoLogo />` como componente SVG para reemplazar el fallback `Store`.

---

## AGENT D — Metadata, SEO y copy

### Archivos de metadata principales

| Archivo                       | Cambio requerido                                  |
| ----------------------------- | ------------------------------------------------- |
| `frontend/src/app/layout.tsx` | `title`, `description` + agregar `icons` metadata |
| `frontend/package.json`       | `name`                                            |
| No existe `manifest.json`     | Crear en `frontend/src/app/manifest.ts`           |

### Copy a actualizar

| Archivo                                       | String actual             | String Kolekto     |
| --------------------------------------------- | ------------------------- | ------------------ |
| `frontend/src/app/(auth)/setup/page.tsx:163`  | "Ir al Punto de Venta"    | "Ir a Kolekto"     |
| `frontend/src/app/(auth)/login/page.tsx:77`   | fallback "Punto de Venta" | fallback "Kolekto" |
| `frontend/src/components/layout/AppShell.tsx` | fallback "POS"            | fallback "Kolekto" |
| `frontend/src/components/layout/Sidebar.tsx`  | fallback "POS"            | fallback "Kolekto" |

### Strings que NO necesitan cambio

- Etiquetas de navegación españolas (ya son correctas per guía de tono Kolekto)
- Botones de acción (Guardar, Cancelar, etc. — ya están bien en español)
- Mensajes de estado (Cargando, Error, etc.)
- Flujo de autenticación (ya en español correcto)

---

## RIESGO IDENTIFICADO

⚠️ **Tailwind v4 + HeroUI**: HeroUI tiene su propio sistema de tokens. Al cambiar `--accent`, hay que verificar que los componentes HeroUI que usan color "primary" queden correctos. HeroUI puede mapear `primary` a un color propio independiente de nuestra CSS var.

⚠️ **Favicon dimensions**: Los PNG en `/public/` tienen dimensiones base 1015×1024 (casi cuadrado), no exactamente los tamaños favicon estándar. Pueden servir como fuente para generar los ICO/PNG correctos.
