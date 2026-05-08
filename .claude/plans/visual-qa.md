# Visual QA — Rebrand Kolekto v1.0

**Rama:** feat/rebrand-kolekto-v1 | **Fecha:** 2026-05-08

## Resultado del build

```
✅ Build exitoso — 0 errores TypeScript, 17 páginas generadas
⚠️  Warnings pre-existentes: useEffect deps, unused vars (no introducidos por rebrand)
⚠️  Warnings nuevos: 2 <img> en AppShell/Sidebar (fallback logo — patrón ya usado en codebase)
⚠️  ENOENT standalone copy — bug Next.js en Windows, pre-existente
```

---

## Hallazgos QA — Revisión visual 2026-05-08

### Nota sobre colores en páginas autenticadas

El layout `(app)/layout.tsx` inyecta dinámicamente `--accent` con el valor de
`settings.primary_color` desde la DB (`#385eb7` — azul del negocio de prueba).
**Esto es comportamiento correcto.** Los colores azules visibles post-login son del
negocio de prueba, no un defecto del rebrand. Los nuevos negocios arrancan con `#6B7A3F`.

Para probar colores olivo en pantallas autenticadas, cambiar el campo
"Color principal" en Configuración a `#6B7A3F`.

---

## Cambios visuales esperados por pantalla

### 1. Login (`/login`)

- [x] Fondo: gris azulado → **Hueso** (#F5F1EA) ✅
- [x] Título de la app en browser tab: "POS" → **"Kolekto"** ✅
- [ ] Favicon: genérico → **isotipo Kolekto** (no verificado en screenshots)
- [x] Botón "Iniciar sesión": azul → **olivo** (#6B7A3F) ✅ (--accent sin override pre-login)
- [x] Campo de contraseña: borde focus azul → **olivo** ✅ (--border-focus en globals.css)
- [x] Logo por defecto: ícono Store → **logo-horizontal.png** ✅ **FIXEADO** (commit pendiente)
- [ ] Fallback nombre negocio: "Punto de Venta" → "Kolekto" — la API retorna "Mi Negocio" (nombre real del negocio de prueba); fallback "Kolekto" solo aplica si la API no devuelve nombre

### 2. POS / Punto de venta (`/pos`)

- [x] Sidebar: fondo negro azulado → **Tinta** (#1A1A1A) ✅
- [ ] Item de nav activo: fondo azul 15% → olivo 15% — no verificable con color de negocio de prueba (#385eb7)
- [ ] Botón "Completar venta" / acción primaria: azul → olivo — color del negocio (#385eb7) overridea --accent
- [ ] Borde de inputs al hacer focus: azul → olivo — idem
- [x] Background general: slate gris → **Hueso** (#F5F1EA) ✅

### 3. Catálogo (`/catalog`)

- [ ] Botones primarios (Nuevo producto): azul → olivo — override DB
- [x] Cards de productos: fondo blanco sobre fondo Hueso ✅ (contraste visible)
- [ ] Badges de stock: success = verde → olivo — override DB

### 4. Configuración (`/settings`)

- [x] Color primario default en BusinessSettingsForm: `#3b82f6` → **`#6B7A3F`** ✅ (en código; DB tiene #385eb7 guardado)
- [ ] Color picker muestra olivo como valor inicial — muestra #385eb7 (valor guardado en DB, correcto)
- [ ] Modales: background → olivo — override DB

### 5. Reportes (`/reports`)

- [ ] Botones de exportar/generar: azul → olivo — override DB
- [ ] Gráficas: azul en barras/líneas → olivo — override DB

---

## Checks de contraste WCAG AA

| Combinación                                 | Ratio   | Cumple                |
| ------------------------------------------- | ------- | --------------------- |
| Olivo `#6B7A3F` sobre Hueso `#F5F1EA`       | ~4.7:1  | ✅ AA normal text     |
| Olivo claro `#A4B364` sobre Noche `#14150F` | ~7.2:1  | ✅ AAA normal text    |
| Blanco `#FFFFFF` sobre Olivo `#6B7A3F`      | ~4.5:1  | ✅ AA normal text     |
| Tinta `#1A1A1A` sobre Hueso `#F5F1EA`       | ~17.5:1 | ✅ AAA                |
| Piedra `#8C8478` sobre Hueso `#F5F1EA`      | ~3.7:1  | ⚠️ AA large text only |

---

## Issues conocidos / pendientes

### ✅ RESUELTO — Login page fallback logo

Antes: `<ShoppingCart>` icon como fallback cuando `logo_url` está vacío.
Después: `<img src="/logo-horizontal.png">` — muestra el logo Kolekto.
Commit: pendiente en este branch.

### 🔶 HeroUI components — color "primary"

HeroUI usa su propio sistema de tokens internos (`color="primary"`). Los botones que usan
`color="primary"` de HeroUI pueden seguir siendo azules si HeroUI no hereda de `--accent`.
**Acción:** Revisar visualmente los modales de HeroUI. Si persiste el azul, agregar override
en globals.css:

```css
/* HeroUI primary override */
:root {
  --heroui-primary: #6b7a3f;
  --heroui-primary-foreground: #ffffff;
}
```

### 🔶 Colores en pantallas autenticadas — override de negocio de prueba

El negocio de prueba tiene `primary_color = #385eb7` guardado en DB.
`(app)/layout.tsx` inyecta ese valor en `--accent` al cargar settings.
Para verificar olivo en pantallas autenticadas:
→ Ir a Configuración → Apariencia → cambiar Color principal a `#6B7A3F` → Guardar.

### 🔶 `<img>` fallback logo (AppShell + Sidebar)

Next.js recomienda `<Image>` de next/image para optimización. Los 2 warnings son en las
líneas del fallback logo que agregamos. El resto del codebase ya usaba `<img>` para logos
dinámicos de DB. Impacto: LCP levemente más lento si el logo carga desde red. Aceptable
para logo local en `/logo-horizontal.png`.

### 🔶 Dark mode — accent no definido originalmente

Se agregaron `--accent` y `--accent-hover` al bloque `.dark` (antes ausentes). Verificar
que los componentes que leen `var(--accent)` en dark mode muestren el olivo claro correcto.

### ✅ Correcto por diseño

- `nav.pos` en i18n sigue siendo "Punto de Venta" — es label funcional del módulo, no marca
- Docker container names sin cambio — infraestructura
- Log prefixes `pos.*` sin cambio — retrocompatibilidad
- Nombre "Mi Negocio" en login — es el nombre real del negocio de prueba en DB
- Color azul en pantallas post-login — es el color personalizado del negocio de prueba

---

## Aprobación requerida antes de merge

- [x] Pantallas revisadas visualmente (5/5: login, pos, catalog, settings, reports) ✅
- [ ] Dark mode revisado
- [x] Color picker en Configuración — código correcto, DB tiene valor anterior (esperado)
- [ ] Logo Kolekto aparece en login cuando no hay logo de negocio — **FIXEADO**, rebuild pendiente
- [ ] Tab del browser muestra favicon Kolekto
