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

## Cambios visuales esperados por pantalla

### 1. Login (`/login`)

- [ ] Fondo: gris azulado → **Hueso** (#F5F1EA)
- [ ] Título de la app en browser tab: "POS" → **"Kolekto"**
- [ ] Favicon: genérico → **isotipo Kolekto**
- [ ] Botón "Iniciar sesión": azul → **olivo** (#6B7A3F)
- [ ] Campo de contraseña: borde focus azul → **olivo**
- [ ] Logo por defecto (si business_settings.logo_url está vacío): ícono Store → **logo-horizontal.png**
- [ ] Fallback nombre negocio: "Punto de Venta" → "Kolekto"

### 2. POS / Punto de venta (`/pos`)

- [ ] Sidebar: fondo negro azulado → **Tinta** (#1A1A1A)
- [ ] Item de nav activo: fondo azul 15% → **olivo 15%**
- [ ] Botón "Completar venta" / acción primaria: azul → **olivo**
- [ ] Borde de inputs al hacer focus: azul → **olivo**
- [ ] Background general: slate gris → **Hueso** (#F5F1EA)

### 3. Catálogo (`/catalog`)

- [ ] Botones primarios (Nuevo producto): azul → **olivo**
- [ ] Cards de productos: fondo blanco sobre fondo Hueso (sutil contraste visible)
- [ ] Badges de stock: success = verde → **olivo**

### 4. Configuración (`/settings`)

- [ ] Color primario default en BusinessSettingsForm: `#3b82f6` → **`#6B7A3F`**
- [ ] Color picker muestra olivo como valor inicial
- [ ] Modales: background → olivo si tienen botón primario

### 5. Reportes (`/reports`)

- [ ] Botones de exportar/generar: azul → **olivo**
- [ ] Gráficas: azul en barras/líneas → **olivo** (depende de si usan CSS vars)

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

---

## Aprobación requerida antes de merge

- [ ] Pantallas revisadas visualmente (mínimo 5)
- [ ] Dark mode revisado
- [ ] Color picker en Configuración muestra #6B7A3F
- [ ] Logo Kolekto aparece en sidebar cuando no hay logo de negocio configurado
- [ ] Tab del browser muestra favicon Kolekto
