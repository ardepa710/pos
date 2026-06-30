---
target: pos
total_score: 36
p0_count: 0
p1_count: 0
timestamp: 2026-06-30T00-05-04Z
slug: frontend-src-components-pos-posterminal-tsx
---
# Critique (re-review) — Terminal POS (Kolekto)

Re-corrida tras el batch de fixes del critique anterior (30/40). Detector (`detect.mjs`) sobre `components/pos`: **0 hallazgos** (`[]`). Design review independiente verificó estado actual desde código.

## Verdicto de los 7 fixes
- **VERIFIED (6):** confirm de vaciar carrito; cobro de un toque (efectivo exacto); descuadre en cierre de caja; bloque de cambio grande + header "Venta registrada"; radios `rounded-lg` (card/badge/botón Cobrar); steppers/eliminar del carrito a 40/36px.
- **PARCIAL → ya cerrado:** los pills de categoría (`.map`) habían quedado en `px-3 py-1` sin focus (mi `replace_all` solo alcanzó el de "Todos"); corregido post-review a `px-3.5 py-2` + focus-visible.

## Design Health Score
| # | Heurística | Score | Δ |
|---|-----------|-------|---|
| 1 | Visibility of status | 4 | ↑ flash + paid/remaining/change + variance |
| 2 | Match real world | 4 | = |
| 3 | User control / freedom | 4 | ↑ confirm reversible, pagos editables |
| 4 | Consistency & standards | 3 | shells de modal aún rounded-xl; focus-ring desigual |
| 5 | Error prevention | 4 | ↑ confirm + variance audit + guards |
| 6 | Recognition vs recall | 4 | = |
| 7 | Flexibility / efficiency | 4 | ↑ cobro de un toque |
| 8 | Aesthetic / minimal | 4 | = |
| 9 | Error recovery | 3 | err.message crudo, sin hints de campo |
| 10 | Help & docs | 2 | = sin atajos/onboarding |
| **Total** | | **36/40** | **Good — listo para shipping con pulido** |

**+6 desde 30/40.** Los deltas trazan a código específico (H3/H5/H7 por confirm+variance+one-tap), no es inflación. H4 retenido en 3 por el `rounded-xl` de los 3 modales y cobertura desigual de focus-ring.

## Nuevos issues introducidos por los fixes
- **N1 (P2 → cerrado):** inconsistencia de pills hermanos ("Todos" vs categoría) — corregido.
- **N2 (P2):** en el cobro de un toque, teclear un monto < total hace desaparecer el botón "Cobrar" sin señal de "insuficiente" (vuelve al hint de agregar método). El camino multi-pago sí muestra restante; el directo no.
- **N3 (P3):** el cambio en el footer pre-cobro (`text-sm`) es más callado que el del recibo (`text-4xl`) — leve inconsistencia con el propio principio del fix #6.

## Remaining (P-tagged)
- **P2** focus-visible en botones de modal Open/Close session y en "Agregar pago"/"Exacto"/"Verificar"/editar-quitar pago.
- **P2** botón eliminar del carrito a 36px (bajo el target de 40).
- **P3** shells de los 3 modales aún `rounded-xl` (drift residual de radio).
- **P3** `err.message` crudo del backend expuesto al cajero (puede filtrar inglés/técnico en UI es-MX).
- **P3** `hasChange`/`change` recomputados por separado en ReceiptModal.

## Questions
1. Optimizaste el último tap (cobro) — ¿por qué el filtro de categoría, lo primero que toca el cajero en cada venta, fue lo último en arreglarse? (ya cerrado)
2. Pusiste confirm para evitar vaciar el carrito por error, pero `handleChargeDirect` cobra dinero real en un tap sin confirmación. ¿Está la fricción en la acción correcta?
3. La pantalla de variance pinta un *sobrante* como olivo/éxito. Para "el dinero nunca miente", ¿un sobre-conteo sin explicar es realmente "OK", o cualquier variación ≠ 0 es bandera amarilla?
