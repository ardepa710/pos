"use client";

// Shared theming for recharts across the reports. Colors use CSS variables so
// charts follow light/dark and the Kolekto palette automatically.

export const CHART_COLORS = {
  accent: "var(--accent)",
  grid: "var(--border)",
  axis: "var(--text-muted)",
  // Categorical palette (semantic + earthy), for multi-series / pies.
  series: [
    "var(--accent)",
    "var(--info)",
    "var(--warning)",
    "var(--error)",
    "#8B6F4F",
    "#7A6B4F",
  ],
} as const;

export const axisTick = { fontSize: 11, fill: "var(--text-muted)" } as const;

export function pesos(v: number | string): string {
  return "$" + Number(v).toLocaleString("es-MX", { maximumFractionDigits: 0 });
}

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  fill?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  /** Formats each value (e.g. pesos). */
  format?: (v: number | string) => string;
}

/** On-theme tooltip card for any recharts chart. */
export function ChartTooltip({
  active,
  payload,
  label,
  format,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs shadow-[var(--shadow-elevated)]">
      {label !== undefined && (
        <p className="mb-1 font-semibold text-[var(--text-primary)]">{label}</p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="tabular-nums text-[var(--text-secondary)]">
          {p.name ? `${p.name}: ` : ""}
          <span
            className="font-semibold"
            style={{ color: p.color ?? p.fill ?? "var(--accent)" }}
          >
            {p.value !== undefined && format ? format(p.value) : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}
