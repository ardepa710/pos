# Rebrand Kolekto v1.0 — Plan de Ejecución

**Rama:** feat/rebrand-kolekto-v1 | **Fecha:** 2026-05-08

---

## Resumen ejecutivo

El rebrand requiere cambios en **3 capas**:

1. **Tokens/CSS** — reemplazar paleta azul → Verde Olivo en `globals.css`
2. **Assets** — mover 17 PNG Kolekto de `/public/` a `frontend/public/`, crear componente SVG logo
3. **Strings** — ~12 strings hardcodeados de marca (metadata, fallbacks, default colors)

**Lo que NO cambia:** lógica de negocio, variables de entorno, nombres de contenedores,
prefijos de logs, i18n funcional (ventas, productos, clientes, etc.)

---

## Inventario completo de archivos afectados

| Archivo                                                     | Tipo de cambio                          | Olas |
| ----------------------------------------------------------- | --------------------------------------- | ---- |
| `frontend/src/app/globals.css`                              | Reemplazar TODOS los valores de tokens  | W1-A |
| `frontend/src/lib/design-tokens.ts`                         | Crear (mover desde raíz)                | W1-B |
| `frontend/src/app/layout.tsx`                               | title, description, icons metadata      | W1-C |
| `frontend/package.json`                                     | name: pos-frontend → kolekto-frontend   | W1-C |
| `frontend/public/`                                          | Mover 17 PNG desde `/public/` raíz      | W1-D |
| `frontend/src/app/manifest.ts`                              | Crear — PWA metadata Kolekto            | W1-C |
| `frontend/src/components/brand/KolektoLogo.tsx`             | Crear — SVG isotipo + wordmark          | W2-A |
| `frontend/src/components/brand/VendorDot.tsx`               | Crear — punto de identidad vendedor     | W2-A |
| `frontend/src/components/layout/AppShell.tsx`               | Usar KolektoLogo, fallback "Kolekto"    | W2-B |
| `frontend/src/components/layout/Sidebar.tsx`                | Usar KolektoLogo, fallback "Kolekto"    | W2-B |
| `frontend/src/components/settings/BusinessSettingsForm.tsx` | Default color #3b82f6 → #6B7A3F         | W2-C |
| `frontend/src/app/(auth)/login/page.tsx`                    | Fallback "Punto de Venta" → "Kolekto"   | W2-C |
| `frontend/src/app/(auth)/setup/page.tsx`                    | "Ir al Punto de Venta" → "Ir a Kolekto" | W2-C |
| `backend/app/main.py`                                       | title="POS API" → "Kolekto API"         | W2-C |
| `README.md`                                                 | Título y descripción                    | W2-C |
| `design-tokens.ts` (raíz)                                   | Eliminar — quedó en `frontend/src/lib/` | W1-B |

---

## Olas de ejecución (wave-based parallelization)

### Wave 0 — Discovery ✅ COMPLETO

4 agentes paralelos. Resultados en `discovery-report.md`.

---

### Wave 1 — Fundación (4 agentes paralelos, sin dependencias entre sí)

**Agent W1-A: `globals.css` — Reemplazar paleta completa**

- Archivo: `frontend/src/app/globals.css`
- Cambios: 30 valores de tokens en `:root` + 15 en `.dark`
- Agregar en `.dark`: `--accent`, `--accent-hover` (actualmente ausentes)
- Demo banner: `#f59e0b` → `#C49A3F`
- Riesgo: BAJO — solo valores de variables, sin renombrar
- Estimado: ~60 líneas editadas

**Agent W1-B: `design-tokens.ts` — Mover a src/lib/**

- Copiar `design-tokens.ts` → `frontend/src/lib/design-tokens.ts`
- Actualizar header comment y exportaciones si necesario
- Estimado: copia + ajuste menor

**Agent W1-C: Metadata + manifest**

- `frontend/src/app/layout.tsx`: title, description, agregar `icons` con rutas a PNGs
- `frontend/package.json`: name → "kolekto-frontend"
- Crear `frontend/src/app/manifest.ts` con metadata PWA Kolekto
- Estimado: ~20 líneas

**Agent W1-D: Assets — Mover brand kit a frontend/public/**

- Copiar 17 PNG de `/public/` → `frontend/public/`
- Archivos clave: logo-horizontal.png, isotipo.png, favicon-\*.png, post-facebook-teaser.png
- Estimado: operación de copia

---

### Wave 2 — Componentes y strings (3 agentes paralelos, depende de W1)

**Agent W2-A: Componentes de marca**

- Crear `frontend/src/components/brand/KolektoLogo.tsx`
  - SVG inline (isotipo geométrico per especificaciones del prompt)
  - Props: variant, size, accentColor, className
  - Variantes: horizontal (isotipo + "Kolekto"), isotipo (solo símbolo), monocromo, inverso
- Crear `frontend/src/components/brand/VendorDot.tsx`
  - Hash determinístico de vendorId → índice en paleta vendorIdentity
  - isActive → siempre olivo `#6B7A3F`
- Crear `frontend/src/components/brand/index.ts` (barrel)
- Estimado: ~120 líneas nuevas

**Agent W2-B: Layout — AppShell + Sidebar**

- `AppShell.tsx`: reemplazar fallback `?? "POS"` → `?? "Kolekto"`
- `Sidebar.tsx`: reemplazar fallback `?? "POS"` → `?? "Kolekto"`
- Ambos: usar `<KolektoLogo>` cuando no hay `logoUrl` en lugar del ícono `Store`
- Estimado: ~15 líneas modificadas cada uno

**Agent W2-C: Strings de marca dispersos**

- `BusinessSettingsForm.tsx`: 6 ocurrencias de `"#3b82f6"` → `"#6B7A3F"`
- `login/page.tsx`: fallback `"Punto de Venta"` → `"Kolekto"`
- `setup/page.tsx`: `"Ir al Punto de Venta"` → `"Ir a Kolekto"`
- `backend/app/main.py`: `title="POS API"` → `title="Kolekto API"`
- `README.md`: título y descripción del proyecto
- Estimado: ~10 líneas modificadas total

---

### Wave 3 — Validación (secuencial)

1. `npm run build` en frontend — debe compilar sin errores nuevos
2. Typecheck: incluido en build (Next.js)
3. Revisar visualmente al menos 5 pantallas en el servidor corriendo
4. Documentar en `visual-qa.md`

---

### Wave 4 — Auditoría (secuencial)

1. `/audit-basic` — revisión rápida de cambios de branding
2. Resolver cualquier finding crítico
3. `/audit-full` → PDF en `.claude/audits/`
4. MR a `main` con descripción completa

---

## Assets a regenerar

| Asset                      | Estado actual           | Acción                                  |
| -------------------------- | ----------------------- | --------------------------------------- |
| `favicon-16.png`           | En `/public/` (Kolekto) | Mover a `frontend/public/`              |
| `favicon-32.png`           | En `/public/` (Kolekto) | Mover a `frontend/public/`              |
| `favicon-48.png`           | En `/public/` (Kolekto) | Mover a `frontend/public/`              |
| `logo-horizontal.png`      | En `/public/` (Kolekto) | Mover a `frontend/public/`              |
| `isotipo.png`              | En `/public/` (Kolekto) | Mover a `frontend/public/`              |
| `post-facebook-teaser.png` | En `/public/` (Kolekto) | Mover a `frontend/public/` (OG image)   |
| `apple-touch-icon`         | No existe               | Usar `isotipo.png` vía Next.js metadata |
| `KolektoLogo SVG`          | No existe               | Crear como componente React             |
| `VendorDot`                | No existe               | Crear como componente React             |

---

## Restricciones aplicadas

- ✅ NO se cambia lógica de negocio
- ✅ NO se cambian dependencias mayores
- ✅ NO se borran tests
- ✅ NO commit a main — MR solamente
- ✅ NO se sube el design-tokens.ts con paths absolutos ni emails
- ✅ Docker container names intactos (pos-backend, pos-frontend, pos-db)
- ✅ Log prefixes intactos (pos.backend.startup)
- ✅ Variables de entorno intactas

---

## Estimación total

| Categoría            | Archivos | Líneas ~ |
| -------------------- | -------- | -------- |
| CSS tokens           | 1        | 90       |
| Nuevos componentes   | 3        | 150      |
| Metadata + manifest  | 3        | 35       |
| Strings hardcodeados | 6        | 20       |
| Assets (copia)       | 17       | —        |
| **Total**            | **30**   | **~295** |

Tiempo estimado: **Wave 1+2 en paralelo = ~8-10 min** | Wave 3+4 = ~25 min (build + audit-full)
