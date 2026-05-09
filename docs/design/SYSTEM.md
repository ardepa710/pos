# Kolekto POS — Design System

**Stack:** Next.js 15 · Tailwind CSS v4 · HeroUI · React 19  
**Brand:** Verde Olivo  
**UI language:** Spanish (es-MX)  
**Token sources:**

- `src/app/globals.css` — CSS custom properties (live, browser-consumed)
- `src/lib/design-tokens.ts` — typed token objects (generates `globals.css` via `npm run tokens`)

> **Rule:** never edit `globals.css` by hand. Edit `design-tokens.ts`, then run `npm run tokens` to regenerate.

---

## 1. Token Reference

All CSS custom properties are declared on `:root` (light theme) and overridden under `.dark`. The `.dark` class is toggled on `<html>` by the theme provider.

### 1.1 Backgrounds

| CSS Variable          | Light value                        | Dark value                       | Semantic intent                |
| --------------------- | ---------------------------------- | -------------------------------- | ------------------------------ |
| `--bg-base`           | `tokens.color.light.bg`            | `tokens.color.dark.bg`           | App background (Hueso / Noche) |
| `--bg-card`           | `tokens.color.light.surface`       | `tokens.color.dark.surface`      | Cards, modals, dropdowns       |
| `--bg-card-elevated`  | `tokens.color.light.surfaceSubtle` | `tokens.color.dark.surfaceMuted` | Hover states, secondary panels |
| `--bg-input`          | `tokens.color.light.surface`       | `tokens.color.dark.surface`      | Text inputs, selects           |
| `--bg-sidebar`        | `#1a1a1a` (Tinta — always dark)    | `tokens.color.dark.bg`           | Left navigation rail           |
| `--bg-sidebar-item`   | `rgba(255,255,255,0.05)`           | same                             | Inactive nav items             |
| `--bg-sidebar-active` | `rgba(107,122,63,0.15)`            | same                             | Active nav item highlight      |

`--bg-sidebar` does not change between light and dark: the sidebar is permanently dark so vendor identity dots maintain consistent contrast.

### 1.2 Borders

| CSS Variable      | Light value                       | Dark value                       | Use                              |
| ----------------- | --------------------------------- | -------------------------------- | -------------------------------- |
| `--border`        | `tokens.color.light.border`       | `tokens.color.dark.border`       | Standard dividers, table rows    |
| `--border-focus`  | `tokens.color.light.accent`       | `tokens.color.dark.accent`       | Input focus ring                 |
| `--border-strong` | `tokens.color.light.borderStrong` | `tokens.color.dark.borderStrong` | Inputs at rest, section dividers |

### 1.3 Text

| CSS Variable               | Light value                        | Dark value                        | Use                                       |
| -------------------------- | ---------------------------------- | --------------------------------- | ----------------------------------------- |
| `--text-primary`           | `tokens.color.light.text`          | `tokens.color.dark.text`          | Body text, labels, headings               |
| `--text-secondary`         | `tokens.color.light.textSecondary` | `tokens.color.dark.textSecondary` | Supporting text, table headers            |
| `--text-muted`             | `tokens.color.light.textMuted`     | `tokens.color.dark.textMuted`     | Captions, timestamps, helper text         |
| `--text-on-dark`           | `tokens.color.light.textInverse`   | —                                 | Text placed on dark surfaces (light only) |
| `--text-on-sidebar`        | `tokens.color.light.border`        | —                                 | Nav item labels                           |
| `--text-on-sidebar-active` | `#ffffff`                          | —                                 | Active nav item label                     |

### 1.4 Accent / Brand

| CSS Variable          | Light value                         | Dark value                               | Notes                               |
| --------------------- | ----------------------------------- | ---------------------------------------- | ----------------------------------- |
| `--accent`            | `tokens.color.light.accent` (Olivo) | `tokens.color.dark.accent` (Olivo claro) | Primary CTAs, active states         |
| `--accent-hover`      | `tokens.color.light.accentHover`    | `tokens.color.dark.accentHover`          | Hover state of accent surfaces      |
| `--accent-subtle`     | `rgba(107,122,63,0.10)`             | `rgba(164,179,100,0.15)`                 | Tinted backgrounds — see §4         |
| `--accent-foreground` | `#ffffff`                           | `tokens.color.dark.bg`                   | Text/icon on filled accent surfaces |

**The golden rule (from `design-tokens.ts`):** Olivo is used only for primary CTAs, active nav indicators, vendor identity dots, and `<StatusBadge status="active">`. It is never used for long-form text, paragraph backgrounds, or card fills.

### 1.5 Semantic — Success / Warning / Error / Info

Each semantic color has a solid token and a `-subtle` variant for tinted backgrounds.

| CSS Variable       | Light                        | Dark                        | Use                                      |
| ------------------ | ---------------------------- | --------------------------- | ---------------------------------------- |
| `--success`        | `tokens.color.light.success` | `tokens.color.dark.success` | Positive status badges, completed states |
| `--success-subtle` | `rgba(107,122,63,0.10)`      | `rgba(164,179,100,0.15)`    | Badge background, confirmation banners   |
| `--warning`        | `tokens.color.light.warning` | `tokens.color.dark.warning` | Low-stock badges, caution alerts         |
| `--warning-subtle` | `rgba(196,154,63,0.10)`      | `rgba(212,176,95,0.15)`     | Warning banner backgrounds               |
| `--error`          | `tokens.color.light.error`   | `tokens.color.dark.error`   | Validation errors, destructive states    |
| `--error-subtle`   | `rgba(160,69,64,0.10)`       | `rgba(196,101,96,0.15)`     | Error message backgrounds, danger hover  |
| `--info`           | `tokens.color.light.info`    | `tokens.color.dark.info`    | Neutral-positive states (pending, draft) |
| `--info-subtle`    | `rgba(74,107,122,0.10)`      | `rgba(122,149,164,0.15)`    | Info badge backgrounds                   |

### 1.6 POS-specific

These tokens exist so POS zones can be reskinned independently without touching the base palette.

| CSS Variable         | Light                | Dark                 | Zone                            |
| -------------------- | -------------------- | -------------------- | ------------------------------- |
| `--cart-bg`          | `--bg-base`          | `--bg-base`          | Shopping cart panel             |
| `--product-card-bg`  | `--bg-card`          | `--bg-card`          | Product grid cards              |
| `--payment-panel-bg` | `--bg-card-elevated` | `--bg-card-elevated` | Payment summary panel           |
| `--receipt-bg`       | `--bg-card`          | `--bg-card`          | Printed/preview receipt surface |

### 1.7 Typography

| CSS Variable     | Value                                                  | Use                            |
| ---------------- | ------------------------------------------------------ | ------------------------------ |
| `--font-sans`    | `"Inter", system-ui, -apple-system, sans-serif`        | All UI text                    |
| `--font-mono`    | `"JetBrains Mono", ui-monospace, "SF Mono", monospace` | Code, SKUs, numeric references |
| `--font-receipt` | `"Courier Prime", "Courier New", monospace`            | Receipt previews and print     |

**Type scale** (from `design-tokens.ts`):

| Key           | Font size   | Line height | Letter spacing     | Use                  |
| ------------- | ----------- | ----------- | ------------------ | -------------------- |
| `xs`          | 11px        | 1rem        | +0.02em            | Captions, fine print |
| `sm`          | 13px        | 1.125rem    | 0                  | Secondary body       |
| `base`        | 14px        | 1.375rem    | 0                  | Primary body text    |
| `md`          | 16px        | 1.5rem      | −0.005em           | Section labels       |
| `lg`          | 18px        | 1.625rem    | −0.01em            | Card titles          |
| `xl`          | 22px        | 1.875rem    | −0.015em           | Page sub-headings    |
| `2xl`         | 28px        | 2.25rem     | −0.025em           | Page headings        |
| `3xl` / `4xl` | 36px / 48px | —           | −0.03em / −0.035em | Display / totals     |

Letter spacing turns negative at `md`+ to counteract the optically heavy appearance of larger Inter glyphs.

**Weights in use:** regular (400) · medium (500) for titles and emphasis · semibold (600) for rare highlights only.

### 1.8 Spacing / Radius

Spacing follows a 4px base unit (`tokens.space`). Only the radius tokens are exposed as CSS variables:

| CSS Variable  | Value | Use                      |
| ------------- | ----- | ------------------------ |
| `--radius-sm` | 4px   | Checkboxes, small badges |
| `--radius`    | 6px   | Inputs, standard buttons |
| `--radius-lg` | 10px  | Cards, larger containers |

Modal and sheet-level containers use `rounded-xl` (14px) or `rounded-2xl` (20px) via Tailwind utilities directly — these are not CSS variables.

### 1.9 Shadows

Shadows are deliberately subtle. Prefer borders over shadows for separation.

| CSS Variable        | Light value        | Dark value                    | Use                        |
| ------------------- | ------------------ | ----------------------------- | -------------------------- |
| `--shadow-card`     | `tokens.shadow.sm` | `0 1px 3px rgba(0,0,0,0.3)`   | Default card elevation     |
| `--shadow-elevated` | `tokens.shadow.md` | `0 4px 12px rgba(0,0,0,0.4)`  | Floating panels, dropdowns |
| `--shadow-modal`    | `tokens.shadow.lg` | `0 20px 60px rgba(0,0,0,0.6)` | Modal dialogs              |

---

## 2. Component Catalogue

All components are in `src/components/ui/`. They are re-exported from `src/components/ui/index.ts` — import from `@/components/ui`.

### 2.1 `<Input>`

**File:** `src/components/ui/Input.tsx`

```typescript
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}
```

- Extends all native `<input>` attributes (`type`, `placeholder`, `disabled`, `ref`, event handlers, etc.)
- `hasError` switches the border and focus ring from `--border-focus` (olive) to `--error` (red) and pins it there even on focus.
- Always forward-ref compatible.

**Usage:**

```tsx
// Standalone
<Input placeholder="Buscar producto..." />

// With error state (managed by react-hook-form)
<Input
  hasError={!!errors.sku}
  {...register("sku")}
/>

// Disabled
<Input disabled value="Solo lectura" />
```

**Do:** Wrap with `<FormField>` whenever you need a label or error message — `<Input>` renders no label.  
**Don't:** Set `border` or `outline` CSS directly on `<Input>` — those are owned by the token system and will break dark mode.

---

### 2.2 `<Button>`

**File:** `src/components/ui/Button.tsx`

```typescript
type Variant = "primary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; // default: "primary"
  size?: Size; // default: "md"
  isLoading?: boolean; // replaces icon with Loader2 spinner, disables button
  icon?: React.ReactNode; // rendered before label; hidden when isLoading
}
```

**Variants:**

| Variant   | Surface                                                         | Use                                         |
| --------- | --------------------------------------------------------------- | ------------------------------------------- |
| `primary` | `--accent` fill, `--accent-foreground` text                     | Main CTA per view — one per screen          |
| `ghost`   | Transparent, `--text-secondary`                                 | Tertiary actions, icon-only toolbar buttons |
| `danger`  | `--error-subtle` fill, `--error` text; fills solid red on hover | Destructive actions                         |
| `outline` | Transparent with `--border` stroke                              | Secondary paired with `primary`             |

**Sizes:**

| Size | Height | Padding | Radius        | Font |
| ---- | ------ | ------- | ------------- | ---- |
| `sm` | 32px   | px-3    | `--radius`    | 12px |
| `md` | 36px   | px-4    | `--radius`    | 14px |
| `lg` | 40px   | px-5    | `--radius-lg` | 14px |

**Usage:**

```tsx
// Default CTA
<Button onClick={handleSave}>Guardar</Button>

// With leading icon
<Button icon={<Plus size={14} />} onClick={openCreate}>
  Agregar producto
</Button>

// Async loading state
<Button isLoading={mutation.isPending} variant="primary">
  Guardar
</Button>

// Destructive
<Button variant="danger" size="sm" onClick={handleDelete}>
  Eliminar
</Button>
```

**Do:** Pass `isLoading` for async actions — it disables the button and renders a spinner automatically.  
**Don't:** Use `primary` twice in the same view — it dilutes hierarchy. Use `outline` or `ghost` for the secondary action.

---

### 2.3 `<Tabs>`

**File:** `src/components/ui/Tabs.tsx`

```typescript
export interface TabItem<T extends string = string> {
  key: T;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  active: T; // TypeScript enforces this is one of the tab keys
  onChange: (key: T) => void;
  variant?: "pill" | "segmented"; // default: "pill"
  className?: string;
}
```

**Variants:**

| Variant     | Layout          | Container width | Use                                                                           |
| ----------- | --------------- | --------------- | ----------------------------------------------------------------------------- |
| `pill`      | Natural (w-fit) | Wraps content   | Context switches within a page (e.g., CatalogManager product/category toggle) |
| `segmented` | Full width      | Fills parent    | Top-level section navigation (e.g., SettingsManager)                          |

Both variants render a `role="tablist"` wrapper with `aria-selected` on buttons.

**Usage:**

```tsx
// Pill — context switch
type CatalogTab = "products" | "categories";
const [tab, setTab] = useState<CatalogTab>("products");

<Tabs
  variant="pill"
  tabs={[
    { key: "products",   label: "Productos" },
    { key: "categories", label: "Categorías" },
  ]}
  active={tab}
  onChange={setTab}
/>

// Segmented — top-level sections with icons
<Tabs
  variant="segmented"
  tabs={[
    { key: "general",    label: "General",    icon: <Settings size={14} /> },
    { key: "negocio",    label: "Negocio",    icon: <Building size={14} /> },
    { key: "ticket",     label: "Ticket",     icon: <Receipt size={14} /> },
  ]}
  active={activeTab}
  onChange={setActiveTab}
/>
```

**Do:** Keep tab labels short (1–2 words). Icons are optional but improve scannability.  
**Don't:** Use `segmented` for context switches inside a panel — it overweights the hierarchy.

---

### 2.4 `<DataTable>`

**File:** `src/components/ui/DataTable.tsx`

```typescript
export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode; // render function — not just a key
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string; // required — used as React key
  isLoading?: boolean; // shows skeleton rows
  emptyMessage?: string; // default: "No hay datos"
  pageSize?: number; // default: 20 (client-side)
  // Server-side pagination: supply all three together
  totalCount?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  density?: "compact" | "normal" | "relaxed"; // default: "normal"
}
```

**Density cell padding:**

| Density   | Cell padding | Head padding |
| --------- | ------------ | ------------ |
| `compact` | px-3 py-1.5  | px-3 py-2    |
| `normal`  | px-4 py-3    | px-4 py-3    |
| `relaxed` | px-4 py-4    | px-4 py-4    |

**Sorting:** client-side by default (sorts the full `data` array). When server-side pagination props are provided, the component skips client sort — the caller must handle `onSortChange` externally.

**Loading state:** renders five skeleton rows with animated pulse shimmer using `--bg-card-elevated`.

**Pagination mode detection:** if `totalCount`, `currentPage`, and `onPageChange` are all provided, the component switches to server-side mode. Otherwise it paginates the `data` array internally.

**Usage (client-side, default):**

```tsx
const columns: Column<ProductRead>[] = [
  {
    key: "name",
    header: "Nombre",
    sortable: true,
    accessor: (row) => (
      <span className="font-medium text-[var(--text-primary)]">{row.name}</span>
    ),
  },
  {
    key: "price",
    header: "Precio",
    className: "text-right",
    accessor: (row) => <CurrencyDisplay amount={row.price_mxn} />,
  },
  {
    key: "status",
    header: "Estado",
    accessor: (row) => (
      <StatusBadge status={row.is_active ? "active" : "inactive"} />
    ),
  },
];

<DataTable
  columns={columns}
  data={products ?? []}
  keyExtractor={(row) => row.id}
  isLoading={isLoading}
  emptyMessage="No hay productos registrados"
  density="compact"
/>;
```

**Do:** Use `keyExtractor` with stable unique IDs (not array index).  
**Don't:** Put complex stateful components in `accessor` — memoize them or lift state up; the accessor runs on every render.

---

### 2.5 `<FormField>`

**File:** `src/components/ui/FormField.tsx`

```typescript
interface FormFieldProps {
  label: string;
  error?: string; // inline error message rendered below the field
  required?: boolean; // renders a red asterisk (aria-hidden) after label
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties; // for grid placement
}
```

Renders a `flex flex-col gap-1.5` wrapper with a `<label>` on top, `children` in the middle, and an optional `<p role="alert">` for the error message at the bottom.

**Usage:**

```tsx
<FormField label="Correo electrónico" required error={errors.email?.message}>
  <Input
    type="email"
    hasError={!!errors.email}
    {...register("email")}
    placeholder="correo@ejemplo.com"
  />
</FormField>
```

For non-`<Input>` children (selects, textareas, custom inputs), apply the same border/focus tokens manually using the `INPUT_CLS` constant pattern shown in `CustomerForm.tsx`.

**Do:** Always supply `error` from `formState.errors` so the user gets contextual feedback.  
**Don't:** Nest `<FormField>` inside another `<FormField>` — the label hierarchy breaks.

---

### 2.6 `<StatusBadge>`

**File:** `src/components/ui/StatusBadge.tsx`

```typescript
interface StatusBadgeProps {
  status: string; // see STATUS_MAP below
  size?: "sm" | "md"; // default: "md"
}
```

Maps a status string to a semantic color bucket, then renders a pill badge.

**Status map:**

| Status string                                                           | Color bucket    | Label (es-MX)                                                   |
| ----------------------------------------------------------------------- | --------------- | --------------------------------------------------------------- |
| `completed`, `active`, `received`, `approved`                           | `success`       | Completado / Activo / Recibido / Aprobado                       |
| `pending`, `draft`, `open`                                              | `info`          | Pendiente / Borrador / Abierto                                  |
| `cancelled`, `voided`, `inactive`, `out_of_stock`, `closed`, `refunded` | `error`         | Cancelado / Anulado / Inactivo / Sin stock / Cerrado / Devuelto |
| `warning`, `low_stock`                                                  | `warning`       | Advertencia / Poco stock                                        |
| (unknown string)                                                        | `info` fallback | raw string                                                      |

**Usage:**

```tsx
<StatusBadge status="active" />          // green "Activo"
<StatusBadge status="low_stock" size="sm" />  // small amber "Poco stock"
<StatusBadge status={order.status} />    // resolves from STATUS_MAP
```

**Do:** Pass the raw API status string — the component resolves labels and colors internally.  
**Don't:** Wrap `<StatusBadge>` in additional colored containers — the badge already carries background + border + text color.

---

### 2.7 `<SearchInput>`

**File:** `src/components/ui/SearchInput.tsx`

```typescript
interface SearchInputProps {
  placeholder?: string; // default: "Buscar…"
  onSearch: (value: string) => void; // debounced callback
  debounceMs?: number; // default: 300
  className?: string;
}
```

Self-contained: manages its own `value` state, debounces calls to `onSearch`, and shows a clear (×) button when the field is non-empty. Emits immediately on clear.

**Usage:**

```tsx
const [search, setSearch] = useState("");

<SearchInput
  placeholder="Buscar clientes..."
  onSearch={setSearch}
  className="max-w-sm"
/>;
```

**Do:** Use for filter-as-you-type on lists. Pair with `useQuery` keyed on the search value.  
**Don't:** Control `value` from outside — this component is uncontrolled by design. Use it for local search; for global search bars, build a controlled variant.

---

### 2.8 `<CurrencyDisplay>`

**File:** `src/components/ui/CurrencyDisplay.tsx`

```typescript
interface CurrencyDisplayProps {
  amount: string | number; // decimal string from API or plain number
  currency?: "MXN" | "USD"; // default: "MXN"
  size?: "sm" | "md" | "lg"; // default: "md"
  showSign?: boolean; // prefix + in green / − in red
  className?: string;
}
```

Formats using `formatMXN` / `formatUSD` from `src/lib/currency.ts` (locale `es-MX`). Always renders with `tabular-nums` to prevent layout shift in tables.

**Sizes:**

| Size | Classes                 |
| ---- | ----------------------- |
| `sm` | `text-sm`               |
| `md` | `text-base`             |
| `lg` | `text-xl font-semibold` |

**Usage:**

```tsx
// Table cell
<CurrencyDisplay amount={row.total_mxn} />

// Cart total (large)
<CurrencyDisplay amount={cartTotal} size="lg" />

// Adjustment with sign
<CurrencyDisplay amount={adjustment} showSign />
// positive → green "+$50.00"; negative → red "−$50.00"
```

**Do:** Always use this component for monetary amounts — never format with `toFixed(2)` inline.  
**Don't:** Pass pre-formatted strings like `"$1,234.56"` — pass the raw numeric value.

---

### 2.9 `<LoadingSpinner>`

**File:** `src/components/ui/LoadingSpinner.tsx`

```typescript
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"; // default: "md" — maps to 16px / 32px / 64px
  className?: string;
  label?: string; // sr-only text, default: "Cargando…"
}
```

Renders `role="status"` with a visually hidden `label` for screen readers. The spinner uses `--border` as the track color and `--accent` as the leading edge.

**Usage:**

```tsx
// Full-page loading
<div className="flex justify-center py-16">
  <LoadingSpinner />
</div>

// Inside a button (prefer Button's isLoading prop instead)
<LoadingSpinner size="sm" label="Guardando…" />

// Inline in a data cell
<LoadingSpinner size="sm" className="mx-auto" />
```

**Do:** Provide a descriptive `label` when the context is not "loading" (e.g., `label="Abriendo caja…"`).  
**Don't:** Use `<LoadingSpinner>` inside `<Button>` — the `Button` component's `isLoading` prop handles that.

---

## 3. Patterns

### 3.1 Modal Pattern

Modals use HeroUI's `<Modal>` + `<ModalContent>`. The design system adds a specific `classNames` structure to apply brand tokens.

**Standard classNames structure:**

```tsx
<Modal
  isOpen={isOpen}
  onClose={onClose}
  size="lg"
  isDismissable={!mutation.isPending}
  hideCloseButton={mutation.isPending}
  classNames={{
    backdrop: "bg-black/60 backdrop-blur-sm",
    base: "bg-[var(--bg-card)] border border-[var(--border)]",
    header: "text-[var(--text-primary)] border-b border-[var(--border)]",
    body: "text-[var(--text-secondary)]",
    footer: "border-t border-[var(--border)]",
  }}
  aria-labelledby="modal-title"
>
  <ModalContent>
    {() => (
      <>
        <ModalHeader>
          <h2 id="modal-title">Título del modal</h2>
        </ModalHeader>
        <ModalBody>...</ModalBody>
        <ModalFooter>...</ModalFooter>
      </>
    )}
  </ModalContent>
</Modal>
```

**`isDismissable` decision:**

| Scenario                                                          | `isDismissable` | `hideCloseButton` |
| ----------------------------------------------------------------- | --------------- | ----------------- |
| Standard create/edit form (idle)                                  | `true`          | `false`           |
| Mutation in flight                                                | `false`         | `true`            |
| Critical flow with no safe cancel (e.g., open/close cash session) | `false`         | `true`            |

**`aria-labelledby` is required** on every `<Modal>`. The value must match an `id` on the visible heading inside `<ModalContent>`. This is a WCAG 2.1 AA requirement and also required by screen readers to announce the modal purpose on open.

For modals that are always open (no external `isOpen` toggle), set `isOpen` directly to `true` and omit `onClose` — see `OpenSessionModal.tsx`.

---

### 3.2 Form Pattern

All forms follow: `react-hook-form` + `zodResolver` + `<FormField>` + `<Input hasError>`.

**Minimal complete example:**

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField, Input, Button } from "@/components/ui";

const Schema = z.object({
  name: z.string().min(1, "Campo requerido").max(100),
  email: z.string().email("Correo inválido"),
});

type FormValues = z.infer<typeof Schema>;

export function MyForm({
  onSubmit,
}: {
  onSubmit: (v: FormValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(Schema) });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      <FormField label="Nombre" required error={errors.name?.message}>
        <Input
          hasError={!!errors.name}
          {...register("name")}
          placeholder="Nombre completo"
        />
      </FormField>

      <FormField label="Correo" required error={errors.email?.message}>
        <Input
          type="email"
          hasError={!!errors.email}
          {...register("email")}
          placeholder="correo@ejemplo.com"
        />
      </FormField>

      <Button type="submit" isLoading={isSubmitting}>
        Guardar
      </Button>
    </form>
  );
}
```

**Wiring rules:**

1. Zod schema is defined at module level (not inside the component) so it is not recreated on every render.
2. `type FormValues = z.infer<typeof Schema>` — derive the TypeScript type from the schema, never declare it separately.
3. Always pass `noValidate` on `<form>` to suppress native browser validation UI.
4. `hasError={!!errors.fieldName}` on `<Input>` — the double-negation coerces `FieldError | undefined` to `boolean`.
5. `error={errors.fieldName?.message}` on `<FormField>` — renders inline error text with `role="alert"`.
6. For non-`<Input>` controls (selects, textareas), apply the token border classes manually. See the `INPUT_CLS` constant in `CustomerForm.tsx` as the canonical reference.

---

### 3.3 Page Layout Pattern

The standard shell for a management page is: `<PageHeader>` + filter controls + `<DataTable>` + modals.

```tsx
"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DataTable,
  type Column,
  SearchInput,
  PageHeader,
  LoadingSpinner,
} from "@/components/ui";
import { MyItemForm } from "./MyItemForm";
import type { MyItem } from "@/types/index";

export function MyManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MyItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["my-items", search],
    queryFn: () => myApi.list({ search: search || undefined }),
  });

  const handleSearch = useCallback((val: string) => setSearch(val), []);

  const columns: Column<MyItem>[] = [
    { key: "name", header: "Nombre", sortable: true, accessor: (r) => r.name },
    {
      key: "actions",
      header: "Acciones",
      className: "w-20",
      accessor: (r) => (
        <button
          onClick={() => {
            setEditing(r);
            setFormOpen(true);
          }}
        >
          Editar
        </button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Mi Módulo"
        action={{
          label: "Agregar",
          icon: <Plus size={16} />,
          onClick: () => setFormOpen(true),
        }}
      />

      <div className="mb-4">
        <SearchInput
          placeholder="Buscar..."
          onSearch={handleSearch}
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          keyExtractor={(r) => r.id}
          emptyMessage="No hay registros"
        />
      )}

      <MyItemForm
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["my-items"] });
          setFormOpen(false);
          setEditing(null);
        }}
        item={editing}
      />
    </div>
  );
}
```

**Structural rules:**

- The outer wrapper is always `<div className="p-6">` — all manager pages share the same inset.
- `<PageHeader>` takes an `action` prop for the primary CTA (usually "Agregar"). Do not put a raw `<Button>` in the header.
- Filter controls go between the header and the table in a `mb-4` wrapper.
- Show `<LoadingSpinner>` during initial load; `<DataTable isLoading>` for subsequent refetches.
- Modals are rendered at the bottom of the component tree, outside the visible layout flow.

---

### 3.4 Cart Item Pattern

`CartItem` (`src/components/pos/CartItem.tsx`) establishes the pattern for collapsible discount rows and clamped quantity inputs.

**Key behaviors:**

**Quantity stepper:**

- A three-element row: `[–]` `[input]` `[+]`
- Input is `type="number"` with native spinner arrows hidden via Tailwind's `[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none` pattern.
- Value is always clamped to `Math.max(1, …)` — quantity zero removes the item via `onRemove`.
- Container uses `--bg-input` fill and `--border` stroke for visual grouping.

**Discount row:**

- Hidden by default (`showDiscount` state, initialized from `item.discount_mxn`).
- Revealed by "+ Descuento" button (ghost text, `--text-muted` → `--accent` on hover).
- When active but with zero value, shows a × dismiss button.
- When a non-zero discount is applied, shows gross subtotal as `--text-muted` for reference.
- Read-only mode (`canEditPrice === false`): renders the applied discount in `--warning` text; no edit controls shown.

```tsx
// Discount row structure (simplified)
{
  showDiscount ? (
    <div className="flex items-center gap-2">
      <label className="text-xs text-[var(--text-muted)]">Descuento:</label>
      <input
        type="number"
        // spinner arrows hidden — see full component for Tailwind classes
        className="w-24 rounded border ... text-right text-xs"
      />
      {!hasDiscount && <button>×</button>}
      {hasDiscount && (
        <span className="text-[var(--text-muted)]">
          bruto {formatMXN(gross)}
        </span>
      )}
    </div>
  ) : (
    <button className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)]">
      + Descuento
    </button>
  );
}
```

---

## 4. Alpha Intent: `--accent-subtle`

`--accent-subtle` carries different opacity values in the two themes: `0.10` in light mode and `0.15` in dark mode. This is intentional, not a mistake.

In light mode, `--bg-base` is a warm off-white (Hueso). The accent color (Olivo) has moderate luminance. A 10% tint on a near-white background produces a clearly perceptible tinted surface — enough to communicate "active" or "branded" without competing with text. Raising it higher would make the tint feel heavy and call too much attention to backgrounds rather than content.

In dark mode, `--bg-base` is close to true black (Noche). Surfaces absorb color; a 10% tint of the light-mode Olivo — which has lower luminance on a dark background than its light counterpart — would produce a surface barely distinguishable from the base. The dark-mode accent is already a lighter hue (Olivo claro, higher luminance), but even so, the eye needs more pigment on a dark field to register the same perceived saturation. At 15%, the tinted surface is clearly different from `--bg-card` while remaining far enough from `--accent` solid that it does not read as a filled button. The 5 percentage-point delta between themes is the minimum needed to achieve perceptual parity: the surface "feels equally subtle" in both contexts.

---

## 5. Naming Conventions

### CSS Variable Naming

Pattern: `--{category}-{modifier?}-{variant?}`

| Category     | Examples                                                                              |
| ------------ | ------------------------------------------------------------------------------------- |
| `bg`         | `--bg-base`, `--bg-card`, `--bg-card-elevated`, `--bg-sidebar`, `--bg-sidebar-active` |
| `border`     | `--border`, `--border-focus`, `--border-strong`                                       |
| `text`       | `--text-primary`, `--text-secondary`, `--text-muted`, `--text-on-dark`                |
| `accent`     | `--accent`, `--accent-hover`, `--accent-subtle`, `--accent-foreground`                |
| Semantic     | `--success`, `--success-subtle`, `--warning`, `--error`, `--error-subtle`, `--info`   |
| POS-specific | `--cart-bg`, `--product-card-bg`, `--payment-panel-bg`, `--receipt-bg`                |
| `font`       | `--font-sans`, `--font-mono`, `--font-receipt`                                        |
| `radius`     | `--radius`, `--radius-sm`, `--radius-lg`                                              |
| `shadow`     | `--shadow-card`, `--shadow-elevated`, `--shadow-modal`                                |

Rules:

- Suffixes follow severity or elevation: `base` < `card` < `card-elevated`.
- `*-subtle` always means a low-opacity tint of the base color for backgrounds.
- `*-foreground` always means the text/icon color to place on top of the filled base (`--accent-foreground` is white or near-black, not olive).
- Avoid inventing new root-level categories. Add variants within existing categories.

### Component File Naming

| Type                         | Convention                                     | Example                                      |
| ---------------------------- | ---------------------------------------------- | -------------------------------------------- |
| React component              | `PascalCase.tsx`                               | `DataTable.tsx`, `StatusBadge.tsx`           |
| Primitive UI (design system) | `PascalCase.tsx` in `src/components/ui/`       | `Button.tsx`, `Input.tsx`                    |
| Feature component            | `PascalCase.tsx` in `src/components/<domain>/` | `CustomerForm.tsx`, `CartItem.tsx`           |
| Page-level manager           | `PascalCase + Manager.tsx`                     | `CustomersManager.tsx`, `CatalogManager.tsx` |
| Utility / lib                | `kebab-case.ts`                                | `design-tokens.ts`, `currency.ts`            |

### i18n Key Naming

Translation keys live in `src/lib/i18n.ts` as a typed flat-ish object (`t`). Naming convention:

```
t.{domain}.{concept}
t.{context}.{action}
```

Examples:

| Key                              | Spanish value                           |
| -------------------------------- | --------------------------------------- |
| `t.nav.customers`                | `"Clientes"`                            |
| `t.customers.add_customer`       | `"Agregar cliente"`                     |
| `t.customers.search_placeholder` | `"Buscar clientes..."`                  |
| `t.sales.open_session`           | `"Abrir sesión"`                        |
| `t.sales.starting_cash`          | `"Efectivo inicial"`                    |
| `t.sales.discount`               | `"Descuento"`                           |
| `t.action.save`                  | `"Guardar"`                             |
| `t.action.cancel`                | `"Cancelar"`                            |
| `t.action.edit`                  | `"Editar"`                              |
| `t.action.view`                  | `"Ver"`                                 |
| `t.error.required`               | `"Campo requerido"`                     |
| `t.error.generic`                | `"Ocurrió un error. Intenta de nuevo."` |

Rules:

- Domain segments: `nav`, `customers`, `sales`, `catalog`, `purchases`, `suppliers`, `settings`, `reports`, `action`, `error`.
- Use `snake_case` for multi-word keys within the domain segment.
- `t.action.*` holds verbs reused across domains (save, cancel, delete, edit, view, confirm).
- `t.error.*` holds generic error messages. Field-specific errors are produced by Zod schemas inline, not stored in `t`.
- Never add a key that duplicates an existing one with a slightly different name. Check `i18n.ts` before adding.
