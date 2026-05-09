# UI Audit — Kolekto POS · 2026-05-08

**Auditor:** Claude Design (`/design-critique` + `/design-system audit`)
**Scope agreed with @acordova:** _Visual design & hierarchy_ + _Design-system consistency_ across **Cashier (Punto de Venta)**, **Catálogo / Inventario**, **Login / Configuración / Setup**.
**Out of scope:** WCAG accessibility audit, UX-copy localization audit (es-MX tone), reports/customers/suppliers/purchases/returns modules.

This audit reads the **frontend Next.js source** as it currently exists in `frontend/src/`. Mockups in `mockups/` were not audited — components diverge enough from them that the source is the ground truth.

> Severity legend: 🔴 Critical (visible bug, brand inconsistency, or contract violation in the plan) · 🟡 Moderate (rough edge, friction, or maintainability debt) · 🟢 Minor (polish).

---

## Executive summary

The Kolekto POS frontend is structurally sound and the _Verde Olivo_ brand language is well-defined in `globals.css` and `lib/design-tokens.ts`. The token vocabulary is rich (cart-bg, payment-panel-bg, success-subtle, etc.) and components mostly reach for it — which means the system works.

The two biggest opportunities are **convergence**, not redesign:

1. **Two parallel token systems exist.** `globals.css` defines the live tokens (`--bg-base`, `--accent`, …) that every component actually consumes. `lib/design-tokens.ts` defines a _different_ token set (`--color-bg`, `--color-accent`, …) and is exported but never injected anywhere. It's effectively dead code, and any new contributor will be confused about which is canonical.
2. **Three styling methodologies coexist.** Tailwind utility classes (the dominant style and what the rest of the app uses), HeroUI components (HeroUI `Modal`, `Button` in 3 places), and large blocks of inline `style={{...}}` + `onMouseEnter/onMouseLeave` (Sidebar, AppShell, login, change-password, auth layout). The third one is the worst: it defeats theme switching, defeats the lint rule against hardcoded colors (Sidebar's logout hover is hardcoded `#ef4444` Tailwind red — _not_ `--error`), and makes maintenance painful.

After that, the largest UX issue is in the **Cashier flow**: the right-hand Payment Panel is dense, the "Cobrar $0.00" CTA is misleading until a payment is added, and there are no keyboard shortcuts — the daily-use surface that should be the most ergonomic is the most click-heavy.

The **Catálogo** screen is the most polished of the three priority areas. **Configuración** has duplicate theme controls between the Negocio tab and the Apariencia tab, and a literal **"Nombre del negocio del negocio"** bug in the tab label string (line 22 of `SettingsManager.tsx`).

**Score:** I'd put this at roughly **74 / 100** for design-system maturity — usable, branded, but with three converging-vs-diverging styling cultures and dead code in the token layer.

---

## 1 · Cashier / Punto de Venta

Files reviewed: `app/(app)/pos/page.tsx`, `components/pos/POSTerminal.tsx`, `components/pos/Cart.tsx`, `components/pos/CartItem.tsx`, `components/pos/ProductGrid.tsx`, `components/pos/PaymentPanel.tsx`, `components/pos/OpenSessionModal.tsx`, `components/pos/ReceiptModal.tsx`.

### 1.1 First impression

The 55/45 split (catalog left, cart-on-top + payment-on-bottom right) is the right structure for a tablet-first cashier UI. The Verde Olivo accent reads well against the `#f5f1ea` Hueso background, and the FX-rate badge and Total block at the top of the payment panel are correctly emphasised.

The eye lands first on the **product grid** (correct), but in the right column the eye lands on the **Total** (correct) before discovering the method-picker grid. That's the right hierarchy.

### 1.2 Findings

| #   | Finding                                                                                                                                                                                                                                                              | Severity | Where                      | Recommendation                                                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | The `Cobrar $0.00` charge button is rendered even when no payments are added. The disabled state uses `bg-[var(--text-muted)]`, which reads as "loading", not "blocked".                                                                                             | 🟡       | `PaymentPanel.tsx` 539–559 | When `payments.length === 0`, replace the charge button with a compact hint ("Agrega un método de pago para cobrar"), or relabel to "Agregar pago" mirroring the dashed-border CTA above it.      |
| C2  | "Cerrar caja" toolbar button uses a leading **emoji glyph (`⬛`)** as an icon. Every other action in the codebase uses `lucide-react`.                                                                                                                               | 🟢       | `POSTerminal.tsx` 205      | Replace with `<LogOut size={14} />` or `<XCircle size={14} />`. Same swap applies to the inline `⚠` in `ProductList` and `✓` in `AppearanceSettings`.                                             |
| C3  | `<section style={{ width: "55%" }}>` and `width: "45%"` — inline percent widths instead of Tailwind utilities. Inconsistent with the rest of the app, defeats responsive variants.                                                                                   | 🟢       | `POSTerminal.tsx` 195, 216 | Use `basis-[55%]` / `basis-[45%]` or move to `grid grid-cols-[55%_45%]` so the breakpoint story can be expressed in classes.                                                                      |
| C4  | No keyboard shortcuts on the cashier surface. Cobrar, Agregar pago, Limpiar carrito and the method picker are all mouse/tap-only. For a daily-use tool this is the single largest friction point.                                                                    | 🔴       | POS module                 | Wire `Enter` on amount input → Agregar pago; `Ctrl+Enter` on payment list → Cobrar; F1–F7 to swap method; `Esc` to clear amount; `/` to focus product search. Document them on a `?` overlay.     |
| C5  | Stock badge is rendered on **every** product card with `track_inventory`, even when stock is healthy. Its colour is `success` (olivo), the same as the price below — the eye flicks between two olivo blobs.                                                         | 🟡       | `ProductGrid.tsx` 165–182  | Show the stock badge only when stock is `low` or `out`. For healthy stock keep the layout calm and let the price be the only olivo element.                                                       |
| C6  | When both `consignment_badge` and `stock_badge` are present, the consignment badge wraps to the next line as `self-start` while the stock badge floats absolute top-right. The card height jumps by ~22px between consigned and non-consigned cards in the same row. | 🟢       | `ProductGrid.tsx` 184–188  | Place both badges in a single absolute-positioned row at the top of the card with `gap-1`, or move both into a flex header strip.                                                                 |
| C7  | The Cart empty state icon (`ShoppingCart size={40}`) uses `text-[var(--border)]` (`#e8e2d5`) on `--cart-bg` (`#f5f1ea`). Contrast ≈ 1.1:1 — the icon is almost invisible. The text below is fine, but the icon adds no visual support.                               | 🟡       | `Cart.tsx` 70–75           | Bump to `text-[var(--text-muted)]` (`#8c8478`) for ≈ 3.4:1 contrast on the same background.                                                                                                       |
| C8  | "Exacto" shortcut button has a `title="Llenar con el restante"` but no `aria-label` and no visible label expansion. On touch devices `title` doesn't render.                                                                                                         | 🟢       | `PaymentPanel.tsx` 410–422 | Add `aria-label`; consider rename to "Restante" — closer to what it actually does.                                                                                                                |
| C9  | Cashier-side discount input on a cart row is hidden behind role check. Supervisor/admin sees the discount field on every line, even with `discount_mxn: 0`. Across 8 line items that's 8 always-visible inputs adding visual noise to the cart.                      | 🟢       | `CartItem.tsx` 110         | Render the discount field collapsed with a "+ Descuento" pill that expands inline; once `> 0`, display value + edit/remove.                                                                       |
| C10 | Quantity input accepts `0` and negative numbers if user clears + retypes. `parseInt(val, 10)` then `onQuantityChange(item.product_id, val)` — no clamp.                                                                                                              | 🟡       | `CartItem.tsx` 71–84       | Clamp to `>=1` on change; if user types `0`, treat as remove (with a small undo banner) or block.                                                                                                 |
| C11 | "Pagos agregados" list has no inline edit — to fix a typo the cashier removes the payment and re-types.                                                                                                                                                              | 🟢       | `PaymentPanel.tsx` 463–496 | Make the amount span editable on click → input with Enter/Esc commit.                                                                                                                             |
| C12 | FX-rate badge competes with the method picker for vertical space inside an already cramped panel. The date label is set in `text-[10px]` — at 1.5× browser zoom on a small POS tablet this is illegible.                                                             | 🟢       | `PaymentPanel.tsx` 264–277 | Move the FX badge into the topbar of the cashier (next to "Cerrar caja"), or collapse it to a single icon + tap-to-expand tooltip. Bump font to 11px (`--text-xs` token from `design-tokens.ts`). |
| C13 | OpenSessionModal imports `X` from lucide-react but never renders it. Lint will eventually catch it.                                                                                                                                                                  | 🟢       | `OpenSessionModal.tsx` 4   | Remove unused import.                                                                                                                                                                             |
| C14 | OpenSessionModal and ReceiptModal are **custom div-backdrop modals**; ConfirmDialog and ProductForm and StockAdjustModal use **HeroUI Modal**. Two competing modal patterns.                                                                                         | 🟡       | POS + Catalog              | Pick one. Recommendation: keep HeroUI for forms (focus trap, scroll lock, ESC-to-close are free), migrate the custom POS modals to it.                                                            |

### 1.3 What works well

- The `flash` micro-interaction on the product card (`isFlashing` state, 400ms scale + colour) is exactly the kind of feedback a fast cashier needs.
- The `tabular-nums` class on every monetary value is correctly applied — no jitter when totals change.
- The Total block typography (uppercase tracking-wider label + `text-3xl font-bold` figure + USD secondary) is a textbook hierarchy and reads as the focal point of the right column.
- Decimal.js is consistently used for money math — no float drift in computed remaining/change.

---

## 2 · Catálogo / Inventario

Files reviewed: `components/catalog/CatalogManager.tsx`, `components/catalog/ProductList.tsx`, `components/catalog/CategoryList.tsx`, `components/catalog/ProductForm.tsx`, `components/catalog/StockAdjustModal.tsx`, `components/ui/DataTable.tsx`, `components/ui/StatusBadge.tsx`.

### 2.1 First impression

`CatalogManager` opens with a clean `<PageHeader>` + tab bar + table. Hierarchy is correct: title is the loudest, the toolbar (search + filter + Add) sits at the right elevation, the table is calm. The Verde Olivo accent only appears on the active tab and the primary action — disciplined, matches the design-token rule of olivo "con disciplina".

### 2.2 Findings

| #   | Finding                                                                                                                                                                                                                                                                                                                 | Severity | Where                                                   | Recommendation                                                                                                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K1  | The `DataTable` zebra pattern alternates `bg-[var(--bg-base)]` (`#f5f1ea`) and `bg-[var(--bg-card)]` (`#fff`), but the row hover state is `bg-[var(--bg-card-elevated)]` (`#f0f0e5`). On a `--bg-base` row the hover is _less_ contrasting than the resting state — visually feels broken.                              | 🟡       | `DataTable.tsx` 173–181                                 | Drop zebra striping (it's marginal in `bg-base`/`bg-card` anyway), keep hover only. Or change zebra to white/`#fbfaf6` and reserve `--bg-card-elevated` strictly for hover.                                                         |
| K2  | Pagination buttons are not symmetrical: `Anterior` is `px-3 py-2` with `transition active:scale-[0.96]`; `Siguiente` is `px-3 py-1.5` with `transition-colors` (no scale). Visible 4px height jump and click-feedback asymmetry.                                                                                        | 🟡       | `DataTable.tsx` 213, 229                                | Extract a `PaginationButton` mini-component or copy-paste the same className to both.                                                                                                                                               |
| K3  | Action column reserves `w-32` (~128px) but renders only 3 small icons (`p-1.5` each ≈ 96px). 32px of dead space on every product row × 20 rows = constant whitespace gully.                                                                                                                                             | 🟢       | `ProductList.tsx` 211                                   | Drop to `w-24` and `text-right`.                                                                                                                                                                                                    |
| K4  | `StatusBadge` `STATUS_MAP` does not include `out_of_stock` — only `low_stock`. If callers ever pass `out_of_stock`, the badge falls through to `info` (blue piedra), which reads as informational rather than red.                                                                                                      | 🟡       | `StatusBadge.tsx` 10–29                                 | Add `out_of_stock: "error"` to the map and `out_of_stock: "Sin stock"` to LABELS.                                                                                                                                                   |
| K5  | `CatalogManager` and `SettingsManager` both ship their own bespoke tab bar (different paddings, different active styles, different sizing — `w-fit` vs `flex-1`).                                                                                                                                                       | 🟡       | `CatalogManager.tsx` 24–52, `SettingsManager.tsx` 38–54 | Extract a shared `<Tabs>` / `<TabBar>` primitive into `components/ui/Tabs.tsx`. HeroUI ships one — use it or wrap it.                                                                                                               |
| K6  | Table row height is `px-4 py-3` ≈ 48px. With 8 columns and 20 rows the catalog forces scroll on most laptop screens. There is no compact density variant.                                                                                                                                                               | 🟢       | `DataTable.tsx`                                         | Add `density="compact" \| "comfortable"` prop; compact ⇒ `py-2`. Use compact in catalog/customers/suppliers tables; comfortable in settings/users.                                                                                  |
| K7  | No bulk-select on the product table. Common SMB needs (mass deactivate, mass reprice, mass tag/category) are mouse-marathons.                                                                                                                                                                                           | 🟢       | `ProductList.tsx`                                       | Add an optional checkbox column to `DataTable` (controlled via prop), wire a sticky "N seleccionados — Acciones ▾" bar at the top of the page.                                                                                      |
| K8  | `ProductForm` defines an `INPUT_CLASS` constant; `CategoryList` defines its own `INPUT_CLASS`; `StockAdjustModal` defines another; setup wizard uses `INPUT_CLS`. Same definition copy-pasted in 4 places, and `BusinessSettingsForm` defines a _fifth_ variant that uses `focus:ring-2` instead of `focus:border-...`. | 🔴       | (5 components)                                          | Promote to a real `<Input>` component in `components/ui/Input.tsx` with `error?: boolean` and `className?: string` slots. Replace all 5 sites. This is the single highest-leverage refactor in the codebase for design consistency. |
| K9  | `StockAdjustModal` validates only on submit. If the user types `-100` (would result in `-95` stock) the visual preview already turns red, but no inline error fires until they click Aplicar.                                                                                                                           | 🟢       | `StockAdjustModal.tsx` 96–119                           | Move the "stock no puede quedar negativo" check into the live `validate()` chain, fire as `deltaError` while typing.                                                                                                                |
| K10 | `CategoryList` quick-add form spreads two `flex-col gap-1.5` blocks + a button on a single `flex-wrap items-end` row. On narrow widths the button drops to its own line and looks orphaned.                                                                                                                             | 🟢       | `CategoryList.tsx` 274–316                              | Wrap inputs in a flex group, use `sm:flex-row flex-col` for a clean stacking story under 640px.                                                                                                                                     |
| K11 | Status uses `is_active` in DB but `StatusBadge` is fed `"active"` / `"inactive"` strings — fine. But the column header is hardcoded `"Estado"` rather than using `t.status` — a string-table miss.                                                                                                                      | 🟢       | `ProductList.tsx` 169                                   | Add `t.products.status: "Estado"` and reference it.                                                                                                                                                                                 |

### 2.3 What works well

- `CatalogManager` PageHeader pattern is clean and reusable. It should be the model for every page.
- `ProductForm` consolidates SKU+name into one row, prices into a 4-col grid, inventory and consignment into bordered subsections — that's the right form chunking for a 14-field model.
- `StockAdjustModal` has an excellent before/after preview block with `TrendingUp`/`TrendingDown` icons. Best piece of micro-design in the catalog module.

---

## 3 · Login / Configuración / Setup

Files reviewed: `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/change-password/page.tsx`, `app/(auth)/setup/page.tsx`, `app/(app)/settings/page.tsx`, `components/settings/SettingsManager.tsx`, `components/settings/BusinessSettingsForm.tsx`, `components/settings/AppearanceSettings.tsx`.

### 3.1 First impression

The auth area is visually clean and on-brand — the centered card on hueso background is the right pattern. The setup wizard has a satisfyingly simple 3-step indicator and a "¡Todo listo!" state with an icon affordance.

But this is also the area where the _implementation_ style diverges most sharply from the rest of the app. **Login, change-password, and the auth layout are written almost entirely in inline `style={{...}}` props with manual `onFocus`/`onBlur`/`onMouseEnter`/`onMouseLeave` handlers** to swap colors. The contrast with the Tailwind-native style of the catalog/POS components is jarring once you start grepping the codebase.

### 3.2 Findings

| #   | Finding                                                                                                                                                                                                                                                                                                                                                             | Severity | Where                                                                                              | Recommendation                                                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | **Login + change-password pages are inline-styled.** Examples: `style={{ backgroundColor: "var(--bg-input)", border: ... }}`, `onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--accent-hover)"}`. Defeats hover/focus states under server-rendered transitions, makes dark-mode harder, and reads as legacy code next to the Tailwind catalog.   | 🔴       | `(auth)/login/page.tsx` 92–270, `(auth)/change-password/page.tsx` 45–289, `(auth)/layout.tsx` 7–18 | Migrate to Tailwind utility classes + the new shared `<Input>` component (K8). Keep the inline `--accent` _override clearing effect_ (lines 55–62 of login) — that's defensive and correct; just lose the styling soup. |
| L2  | "Settings" tab generates its label by `t.settings.business_name.replace(" del negocio", "") + " del negocio"`. If the i18n string ever changes from "Nombre del negocio", the result becomes either "Nombre del negocio del negocio" or "Nombre". **Definite latent bug.**                                                                                          | 🔴       | `SettingsManager.tsx` 22–24                                                                        | Add `t.settings.tab_business: "Negocio"` and reference it directly.                                                                                                                                                     |
| L3  | **Theme picker is duplicated.** `BusinessSettingsForm` has a radio "theme" group; `AppearanceSettings` has a 3-card visual picker. Both write to `business_settings.theme`. Users see two controls for the same setting in the same Configuración screen.                                                                                                           | 🔴       | `BusinessSettingsForm.tsx` 218–240, `AppearanceSettings.tsx` 67–86                                 | Move theme + primary_color + logo to **Apariencia**. Keep BusinessSettingsForm scoped to identity (name, type, support WhatsApp).                                                                                       |
| L4  | Sidebar logout hover is **hardcoded Tailwind red** (`rgba(239, 68, 68, 0.15)` and `#ef4444`) — _not_ `var(--error)`. PLAN §7.2 explicitly says "componentes usan únicamente `var(--accent)`, `var(--bg-card)`, etc. — cero colores hardcoded". This is a contract violation, and a red-flag for a palette-aware product where business owners can re-brand the app. | 🔴       | `Sidebar.tsx` 218–222                                                                              | Replace `rgba(239,68,68,0.15)` → `var(--error-subtle)` and `#ef4444` → `var(--error)`.                                                                                                                                  |
| L5  | Demo-mode banner in `globals.css` has hardcoded colors (`background: #c49a3f; color: #1a1a1a`).                                                                                                                                                                                                                                                                     | 🟡       | `globals.css` 142–153                                                                              | Use `background: var(--warning); color: var(--text-primary)`.                                                                                                                                                           |
| L6  | **Default primary color literal `#6B7A3F` repeated 3 times** in `BusinessSettingsForm` (defaultValues, reset callback, color-input fallback).                                                                                                                                                                                                                       | 🟡       | `BusinessSettingsForm.tsx` 63, 76, 102, 183, 192                                                   | Promote to `BRAND_DEFAULT_COLOR` constant in `lib/design-tokens.ts` and import.                                                                                                                                         |
| L7  | The `--accent-subtle` runtime override does `color + "1a"`. Works only for 6-digit hex. Will silently produce broken values for `#FFF`, named colors, or hex-with-alpha.                                                                                                                                                                                            | 🟡       | `BusinessSettingsForm.tsx` 97, `(app)/layout.tsx` 55                                               | Parse + reformulate via `rgba(r,g,b,0.1)` using a shared `hexToRgba` helper.                                                                                                                                            |
| L8  | Setup wizard step indicator labels are `hidden sm:inline` — on mobile (where a small-business owner is most likely to bootstrap a tablet POS) only the numeric circles render, with no labels at all.                                                                                                                                                               | 🟢       | `(auth)/setup/page.tsx` 127–134                                                                    | Show a single label below the active step on mobile (`<span class="sm:hidden mt-2 text-xs">{label}</span>` outside the step row).                                                                                       |
| L9  | Setup wizard Step 2 ("¿Qué tipo de comercio es?") is a `grid-cols-3` of 12 items. On 360px-wide phones each pill is ~95px wide, fine for short labels like "Ropa" but cramped for "Belleza y cuidado personal".                                                                                                                                                     | 🟢       | `(auth)/setup/page.tsx` 219–235                                                                    | `grid-cols-2 sm:grid-cols-3`.                                                                                                                                                                                           |
| L10 | Setup wizard Step 1 → Step 2 advances _locally only_ — `business_name` is held in form state until Step 2 submits. If the user closes the tab between steps the data is lost without warning.                                                                                                                                                                       | 🟢       | `(auth)/setup/page.tsx` 198–207                                                                    | Auto-save on step transition (`PATCH /setup/draft`) or localStorage persist.                                                                                                                                            |
| L11 | Setup wizard mixes HeroUI `<Button>` (steps 1–2 + final card) with custom `<button>` pills (the type-of-commerce grid) — three button styles in one screen.                                                                                                                                                                                                         | 🟢       | `(auth)/setup/page.tsx`                                                                            | Standardise: type-grid uses pills (correct). Steps 1/2 next/back/finish should use the same `<Button>` token.                                                                                                           |
| L12 | WhatsApp field has zero format validation. Accepts free text.                                                                                                                                                                                                                                                                                                       | 🟢       | `(auth)/setup/page.tsx` 190–196, `BusinessSettingsForm.tsx` 199–206                                | Mask `+52 XXX XXX XXXX` with [react-imask](https://imask.js.org/) or a simple regex zod refine.                                                                                                                         |

### 3.3 What works well

- `setup` wizard's success state (Step 3) is genuinely warm — the green-tinted check icon over success-subtle background is a perfect celebratory micro-moment.
- The `(app)/layout.tsx` runtime injection of `--accent` etc. from `business_settings.primary_color` is the right architecture for "instalación = una sucursal con su propio color".
- `AppearanceSettings` uses optimistic update on theme change so the UI flips immediately. Excellent.

---

## 4 · Cross-cutting design-system findings

### 4.1 Audit summary

| Category   | Defined                                                                                                                  | Hardcoded values found                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Colors     | 32 CSS vars in `globals.css` + parallel TS object in `design-tokens.ts`                                                  | **5** known hardcoded: `#ef4444`, `rgba(239,68,68,0.15)`, `#c49a3f`, `#1a1a1a`, `#6B7A3F` (×3)                                    |
| Spacing    | `radius`, `radius-sm`, `radius-lg` only — full spacing scale exists in `design-tokens.ts` but is not exposed as CSS vars | Tailwind's default spacing is used directly; no `--space-*` tokens consumed by components                                         |
| Typography | `--font-sans`, `--font-mono`, `--font-receipt`                                                                           | Sizes/weights set per-component via Tailwind classes — no `--text-*` tokens; the typography scale in `design-tokens.ts` is unused |
| Shadows    | `--shadow-card`, `--shadow-elevated`, `--shadow-modal`                                                                   | Used consistently 👍                                                                                                              |
| Modals     | 2 patterns (HeroUI vs custom div)                                                                                        | 5 modal components, 2 patterns                                                                                                    |
| Buttons    | No primitive — every button is hand-rolled with cn()                                                                     | At least 7 button visual styles in use                                                                                            |
| Inputs     | No primitive — `INPUT_CLASS` constant copy-pasted 5 times                                                                | 5 implementations, 2 focus styles (`border` vs `ring`)                                                                            |
| Tabs       | No primitive                                                                                                             | 2 implementations                                                                                                                 |

### 4.2 Component completeness

| Component                       | States covered                                             | Variants    | Docs | Score    |
| ------------------------------- | ---------------------------------------------------------- | ----------- | ---- | -------- |
| `PageHeader`                    | default + action variant                                   | minimal     | none | 7/10     |
| `DataTable`                     | loading / empty / data; sortable; client+server pagination | implicit    | none | 7/10     |
| `StatusBadge`                   | 4 colour keys, 2 sizes                                     | well-mapped | none | 7/10     |
| `SearchInput`                   | default + clear                                            | one variant | none | 7/10     |
| `FormField`                     | label, required, error                                     | one variant | none | 8/10     |
| `LoadingSpinner`                | sm/md/lg, optional label                                   | one variant | none | 7/10     |
| `ConfirmDialog`                 | danger / warning / info                                    | well-mapped | none | 7/10     |
| `CurrencyDisplay`               | (assumed standard)                                         | size sm     | none | 6/10     |
| **Missing: `Input`**            | —                                                          | —           | —    | **0/10** |
| **Missing: `Button`**           | —                                                          | —           | —    | **0/10** |
| **Missing: `Tabs`**             | —                                                          | —           | —    | **0/10** |
| **Missing: `Card` / `Section`** | —                                                          | —           | —    | **0/10** |

### 4.3 Naming consistency

| Issue                    | Examples                                                                                                  | Fix                                                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Two token namespaces** | `--bg-base` (live) vs `--color-bg` (in `design-tokens.ts`, not used)                                      | Pick one. Recommend keeping the live `globals.css` names and either deleting `design-tokens.ts` or rewriting it to _generate_ `globals.css` from the TS source. |
| **Constant naming**      | `INPUT_CLASS` (3 files) vs `INPUT_CLS` (setup)                                                            | Once `<Input>` exists, this is moot.                                                                                                                            |
| **Theme keys**           | `theme_light`/`theme_dark`/`theme_system` in i18n; `light`/`dark`/`system` in code; `default_theme` in DB | Fine, but document.                                                                                                                                             |
| **i18n keys**            | `nav.products` (legacy) vs `nav.catalog` (standard) — both exist                                          | Drop the legacy aliases once all callers are migrated. The comment in `i18n.ts` flags it but the cleanup hasn't happened.                                       |
| **CSS var density**      | `--accent-subtle` is `0.10` opacity; `--success-subtle` is `0.10`; `--accent-subtle` in dark is `0.15`    | Either standardize to one alpha or document the bump in dark. Currently inconsistent without a stated reason.                                                   |

### 4.4 Visual hierarchy across the app

- **Primary actions** (`bg-[var(--accent)] text-white`) are correctly reserved for the most important CTA on each surface (Cobrar, Guardar, Iniciar sesión, Agregar producto). Discipline holds.
- **Secondary actions** (`border-[var(--border)] text-[var(--text-secondary)]`) are correctly used for Cancel, Cerrar caja, etc.
- **Tertiary affordances** (icon-only buttons in tables) are consistently `text-[var(--text-muted)]` with hover-to-`accent`/`error`. Good discipline.

The only place hierarchy breaks is the **right column of the cashier**: the Total block and the method picker compete for the user's first glance because both are visually loud. See finding C12.

### 4.5 What works well

- `StatusBadge` is the model for what "small but right" looks like — single source of truth for status colour, single source of truth for label.
- `PageHeader` is correctly minimal — title + subtitle + one action.
- The `--cart-bg`/`--product-card-bg`/`--payment-panel-bg`/`--receipt-bg` tokens show _intent_ — surfaces are named by purpose, not by colour. That's good design-system thinking.

---

## 5 · Priority recommendations

If you do nothing else from this audit, do these:

1. **Build a `<Input>`, `<Button>`, and `<Tabs>` primitive** (issue K8 + K5 + cross-cutting). One afternoon of work, eliminates 5 copy-pasted `INPUT_CLASS` constants, closes the `focus:border` vs `focus:ring` inconsistency, and unblocks the rest of the system. **Highest leverage change in the codebase.**
2. **Migrate the auth pages off inline styles** (L1). Recreate `login`, `change-password`, `(auth)/layout` and `Sidebar` with Tailwind classes. This will surface the K8 primitives in real use and fix the remaining hardcoded `#ef4444` (L4).
3. **Reconcile the two token systems** (root cause). Delete `lib/design-tokens.ts` _or_ rewrite it as the source for `globals.css` (e.g. a build-time codegen). Either is fine; both is the bug.
4. **Fix the cashier ergonomics** (C1 + C4 + C5): rename/hide the disabled charge button, wire keyboard shortcuts (Enter / F1–F7 / Esc), drop the always-on stock chip on healthy products. These three changes will move the daily-use surface from "works" to "fast".
5. **Resolve the duplicate theme picker + `business_name` tab string bug** (L2 + L3). 30-minute fix that removes a confusing UX and a latent string bug from Configuración.

---

## 6 · Tracked issues

A companion file `TASKS-UI-AUDIT.md` (sibling of this document) lists every finding above as a discrete, prioritised, actionable task with file paths and line numbers. Recommended workflow: copy each row into your tracker (Linear/Asana/issue) or batch them into PRs grouped by area.

---

## 7 · Methodology & limitations

- This is a **static-source audit**. No screenshots, no runtime exploration, no usability test with real cashiers. Some findings about visual hierarchy (C7, K1) would benefit from a screenshot pass — flagging that here so the conclusions are read with appropriate confidence.
- WCAG / accessibility findings are out of scope per agreed audit scope, but two near-accessibility issues (C7, C8, K2 misaligned states) surface naturally from the visual audit and are reported.
- es-MX UX-copy review was out of scope; the Settings tab string bug (L2) is a code-bug that only becomes a copy bug if it ever ships, so it lands here.
- The `mockups/` folder was not audited because the source has diverged from it; if the mockups are still meant to be design references, a follow-up reconciliation pass would be useful.

— end of audit —
