---
target: pos
total_score: 30
p0_count: 1
p1_count: 2
timestamp: 2026-06-29T23-18-35Z
slug: frontend-src-components-pos-posterminal-tsx
---

# Critique — Terminal POS (Kolekto)

## Design Health Score

| #         | Heurística                     | Score     | Issue clave                                                                                                                   |
| --------- | ------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status    | 3         | Buen feedback (flash al agregar, "Procesando…", estados de impresión); falta una confirmación explícita "Venta registrada ✓". |
| 2         | Match System / Real World      | 4         | es-MX nativo y en lenguaje de cajero ("Cobrar $X", "Exacto", cambio/restante). Excelente.                                     |
| 3         | User Control and Freedom       | 3         | "Vaciar" sin undo/confirm; recibo `isDismissable={false}`; sin "anular venta".                                                |
| 4         | Consistency and Standards      | 3         | Deriva de radios: cards `rounded-xl` (14px) y botón Cobrar `rounded-xl` vs. DESIGN ≤10px.                                     |
| 5         | Error Prevention               | 3         | Tarjeta exige referencia, gift card exige lookup; pero `parseInt` de cantidad cae a 1 en paste malo; sin techo de sobre-pago. |
| 6         | Recognition Rather Than Recall | 3         | Métodos visibles, pero hay que recordar "Agregar pago" antes de que "Cobrar" se active.                                       |
| 7         | Flexibility and Efficiency     | 2         | Sin atajos de teclado, sin enter-para-agregar ni lector de código. Venta de efectivo más rápida ≈ 5 taps.                     |
| 8         | Aesthetic and Minimalist       | 4         | Disciplinado: olivo <10%, plano/borde-primero, dinero en tabular-nums. On-brand.                                              |
| 9         | Error Recovery                 | 3         | Error de cobro inline, fallback a `window.print()`; pero mensajes terse sin próximo paso.                                     |
| 10        | Help and Documentation         | 2         | Inexistente (aceptable en POS), sin coaching de empty-state más allá de "Agrega un método".                                   |
| **Total** |                                | **30/40** | **Good — ship con correcciones**                                                                                              |

## Anti-Patterns Verdict

**¿Parece hecho por IA? No.**

**LLM assessment:** Un cajero acostumbrado a Square/Clover confiaría y no se trabaría en componentes raros. Libra las 4 anti-referencias: sin azules/morados ni gradientes (olivo único acento, solo semántico) → no SaaS genérico; superficie hueso cálida → no POS corporativo frío; color ganado, badges solo para stock bajo/agotado/consignación → no recargado; jerarquía moderna → no anticuado. Lo único que haría dudar a un cajero veloz es la **fricción del flujo de cobro**, no el aspecto.

**Deterministic scan (`detect.mjs`):** **0 hallazgos** sobre `frontend/src/components/pos` (`[]`). El detector corrobora el veredicto del LLM: ningún patrón de slop determinístico. Sin falsos positivos. Lo que el detector NO puede ver y el LLM sí: tamaños de toque <44px, ratios de contraste, fricción de flujo, deriva de radios vs. el propio DESIGN.md.

**Visual overlays:** No disponible — no hay automatización de navegador en esta sesión; review desde código fuente.

## Overall Impression

El sistema visual es de nivel 4 (disciplina de color, dinero honesto, feedback táctil al agregar). Lo que lo frena del rango 30+ alto es la **eficiencia del flujo de cobro** (H6/H7) y dos huecos que tocan exactamente la promesa "el dinero nunca miente" y "velocidad sobre adorno". La mayor oportunidad: **el camino de efectivo exacto debe ser un solo toque, y el cierre de caja debe decir si cuadró.**

## What's Working

1. **Color olivo disciplinado + semántico** — acento confinado a CTA/activo/foco; success reusa olivo; warning/error siempre con ícono+texto (`ProductGrid.tsx:165-178`, `PaymentPanel.tsx:549-561`). Ejecuta fielmente la regla anti-"recargado".
2. **Dinero honesto y alineado** — `tabular-nums` en todo monto, Decimal.js (sin float drift), MXN/USD contextual (`PaymentPanel.tsx:129-141`, `Cart.tsx:119-126`). Cumple "el dinero nunca miente".
3. **Feedback al agregar** — flash de éxito 400ms + `active:scale-[0.97]` en el control más tocado y rápido (`ProductGrid.tsx:53-60, 152-162`).

## Priority Issues

**[P0] "Vaciar" carrito sin confirmación**

- **Why:** En tablet táctil en mostrador, un pulgar perdido borra una orden a medias frente al cliente. Trabajo perdido + torpeza visible = golpe de confianza.
- **Fix:** Undo toast (mejor para velocidad que un modal): vaciar, mostrar "Carrito vaciado — Deshacer" 5s.
- **Where:** `Cart.tsx:54-65`.
- **Comando:** `$impeccable harden`

**[P1] Efectivo exacto requiere dos commits ("Agregar pago" → "Cobrar")**

- **Why:** Es la promesa del ticket de 30s. La maquinaria de pago dividido se impone al 90% de ventas de un solo pago. `canCharge` exige `payments.length > 0`.
- **Fix:** Si `payments.length === 0` y monto ≥ total (o vacío = exacto), que "Cobrar $X" cobre directo con un pago sintetizado. "Agregar pago" queda solo para split.
- **Where:** `PaymentPanel.tsx:142-143, 453-472, 578-606`.
- **Comando:** `$impeccable shape`

**[P1] Cierre de caja nunca muestra el descuadre**

- **Why:** El cierre es el momento de auditoría — "¿cuadró?" es todo el punto. Mandar al cajero sin feedback socava la promesa central y el cierre emocional.
- **Fix:** Mostrar esperado = inicial + ventas efectivo, y tras enviar "Sobrante/Faltante $X" con olivo/tinto + ícono antes de cerrar.
- **Where:** `CloseSessionModal.tsx:82-96, 38-46`.
- **Comando:** `$impeccable harden`

**[P2] Deriva de radios vs. design system**

- **Why:** Cards y botón Cobrar usan `rounded-xl` (14px); DESIGN limita cards a 10px. Pequeño, pero acumula "off".
- **Fix:** Card → `rounded-lg`; botón Cobrar → `rounded-lg`.
- **Where:** `ProductGrid.tsx:153,168`, `PaymentPanel.tsx:589`.
- **Comando:** `$impeccable polish`

**[P2] Afirmación de éxito + monto de cambio demasiado callados**

- **Why:** Al entregar cambio, el número de cambio debe ser lo más grande en pantalla en ese instante; hoy es una franja sutil al fondo del recibo.
- **Fix:** Promover el cambio a un bloque grande arriba del recibo cuando `hasChange`; añadir estado de header de éxito.
- **Where:** `ReceiptModal.tsx:92-106, 212-220`.
- **Comando:** `$impeccable layout`

## Persona Red Flags

**Alex (cajero veloz — velocidad/teclado)**

- Sin enter-para-agregar / lector de código: búsqueda con debounce 250ms (`ProductGrid.tsx:70`) pero sin "primer resultado con Enter"; cada alta es tap.
- Sin cobro por teclado: nada liga Enter del input a "Agregar pago" ni dispara "Cobrar".
- El doble-commit forzado (P1) le cuesta más a Alex: pura ceremonia en el camino caliente.

**Sam (accesibilidad / WCAG AA)**

- **Botón Cobrar deshabilitado:** `bg-[var(--text-muted)]` (#8C8478) + texto blanco (`PaymentPanel.tsx:593`) ≈ 3.0:1 — **bajo el 4.5:1**. Falla AA. (Verificar.)
- **Texto muted sobre fondo muted:** #8C8478 sobre `payment-panel-bg` (#F0F0E5) roza el límite para 11px (SKU `ProductGrid.tsx:193`, "c/u" `CartItem.tsx:103`). Probable fallo.
- **Sin focus-visible:** DESIGN exige outline olivo 2px en todo control; los botones POS no lo declaran. Teclado sin foco visible = requisito AA incumplido.
- Bien: aria-labels en botones de ícono, `aria-labelledby` en modales.

**Casey (táctil/tablet — alcance de pulgar, 44px)**

- **Targets <44px por todos lados:** steppers de cantidad `h-7 w-7` = 28px (`CartItem.tsx:69,94`); input qty `h-7 w-10`; pills de categoría `py-1` ≈ 24px (`ProductGrid.tsx:80`); X/eliminar `p-1` ≈ 24px. Bajo el mínimo táctil que el producto promete ("áreas de toque generosas").
- **+/- adyacentes a 28px** (`CartItem.tsx:63`) invitan mis-taps en tablet en movimiento.
- Bien: cards de producto grandes; botón "Cobrar" full-width `py-3.5` (~52px) es el único control bien dimensionado para pulgar.

**Lucía, la cajera (persona del proyecto, de PRODUCT.md)**

- Perfil: no técnica, de pie, bajo presión de tiempo, a veces en tablet. Cobra decenas de veces al día.
- Red flags: la ceremonia "Agregar pago→Cobrar" la frena en su tarea #1; el cierre de caja sin "¿cuadró?" la deja insegura al final del turno; los steppers de 28px le hacen pelear con el carrito frente al cliente.

## Minor Observations

- Labels en mayúsculas tracked ("MÉTODO", "PAGOS AGREGADOS", "TOTAL" — `PaymentPanel.tsx:298,314,478`) rozan el "eyebrow SaaS" del anti-ref. En product UI funcional es tolerable; vigilar que no se vuelva reflejo.
- `parseInt` de cantidad cae silenciosamente a 1 en paste inválido (`CartItem.tsx:80`).
- Fecha de FX sin formato es-MX (`POSTerminal.tsx:209`).
- Strings de error de gift card hardcodeados en vez de `t.*` (`PaymentPanel.tsx:174,182`) — drift de i18n en producto 100% es-MX.
- `uid()` con `Math.random()` (`PaymentPanel.tsx:98`): `crypto.randomUUID()` es una línea y sin colisiones.

## Questions to Consider

1. Si el ticket de efectivo de 30s es la métrica de éxito, ¿por qué el camino feliz exige dos toques para cobrar? ¿Qué se rompe si "Cobrar" simplemente funciona cuando monto ≥ total y no hay split pendiente?
2. El cierre de caja es donde "el dinero nunca miente" se pone literalmente a prueba — ¿por qué es la única pantalla que no le dice al cajero si cuadró?
3. Construyes una marca de "áreas de toque generosas" y luego dimensionas los controles más repetidos (steppers, eliminar) a 28px. ¿El carrito es superficie táctil, o de mouse esperando funcionar en tablet?
