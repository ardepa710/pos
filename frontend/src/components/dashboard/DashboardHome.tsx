"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingCart,
  Banknote,
  CreditCard,
  Receipt,
  Package,
  BarChart3,
  Users,
  ArrowRight,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { reportsApi } from "@/lib/api";
import { CurrencyDisplay, LoadingSpinner } from "@/components/ui";
import { ChartTooltip, axisTick, pesos } from "@/components/ui/chart-kit";
import { t } from "@/lib/i18n";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

interface SalesPeriodRow {
  period: string;
  sale_count: number;
  total_mxn: string;
}

type KpiTone = "olivo" | "azul" | "mostaza" | "cafe";
const TONE_BG: Record<KpiTone, string> = {
  olivo: "bg-[var(--accent-subtle)] text-[var(--accent)]",
  azul: "bg-[var(--info-subtle)] text-[var(--info)]",
  mostaza: "bg-[var(--warning-subtle)] text-[var(--warning)]",
  cafe: "bg-[var(--bg-card-elevated)] text-[var(--text-secondary)]",
};

function KpiCard({
  icon,
  label,
  value,
  tone,
  i,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  tone: KpiTone;
  i: number;
}) {
  return (
    <div
      className="motion-stagger hover-lift flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)]"
      style={{ "--i": i } as CSSProperties}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${TONE_BG[tone]}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-[var(--text-muted)]">
          {label}
        </p>
        <div className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
          {value}
        </div>
      </div>
    </div>
  );
}

const QUICK_LINKS: {
  href: string;
  label: keyof typeof t.nav;
  icon: ReactNode;
  tone: KpiTone;
}[] = [
  {
    href: "/pos",
    label: "pos",
    icon: <ShoppingCart size={18} />,
    tone: "olivo",
  },
  {
    href: "/catalog",
    label: "catalog",
    icon: <Package size={18} />,
    tone: "mostaza",
  },
  {
    href: "/reports",
    label: "reports",
    icon: <BarChart3 size={18} />,
    tone: "azul",
  },
  {
    href: "/customers",
    label: "customers",
    icon: <Users size={18} />,
    tone: "cafe",
  },
];

export function DashboardHome() {
  const { token, user } = useAuth();

  const { data: daily, isLoading } = useQuery({
    queryKey: ["dashboard", "daily"],
    queryFn: () => reportsApi.daily(token),
    enabled: !!token,
  });

  const { data: trend = [] } = useQuery<SalesPeriodRow[]>({
    queryKey: ["dashboard", "trend-7d"],
    queryFn: async () => {
      const params = new URLSearchParams({
        date_from: isoDaysAgo(6),
        date_to: isoDaysAgo(0),
        group_by: "day",
      });
      const res = await fetch(`${API_BASE}/v1/reports/sales?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json() as Promise<SalesPeriodRow[]>;
    },
    enabled: !!token,
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {t.dashboard.greeting}
          {user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
          {new Date().toLocaleDateString("es-MX", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {/* KPIs */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            i={0}
            tone="olivo"
            icon={<Receipt size={20} />}
            label={t.dashboard.today_sales}
            value={(daily?.total_sales ?? 0).toLocaleString("es-MX")}
          />
          <KpiCard
            i={1}
            tone="azul"
            icon={<ShoppingCart size={20} />}
            label={t.dashboard.today_revenue}
            value={<CurrencyDisplay amount={daily?.total_revenue_mxn ?? "0"} />}
          />
          <KpiCard
            i={2}
            tone="mostaza"
            icon={<Banknote size={20} />}
            label={t.dashboard.cash}
            value={<CurrencyDisplay amount={daily?.cash_total ?? "0"} />}
          />
          <KpiCard
            i={3}
            tone="cafe"
            icon={<CreditCard size={20} />}
            label={t.dashboard.card}
            value={<CurrencyDisplay amount={daily?.card_total ?? "0"} />}
          />
        </div>
      )}

      {/* 7-day revenue */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
          {t.dashboard.last_7_days}
        </h3>
        {trend.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">
            {t.dashboard.no_data}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend} margin={{ top: 8, right: 8, left: 4 }}>
              <defs>
                <linearGradient id="dashFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--accent)"
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--accent)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="period"
                tickFormatter={(v: string) => (v.length > 6 ? v.slice(5) : v)}
                tick={axisTick}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => pesos(v)}
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                content={<ChartTooltip format={pesos} />}
                cursor={{ stroke: "var(--accent)", strokeOpacity: 0.3 }}
              />
              <Area
                type="monotone"
                name="Ventas"
                dataKey={(row: SalesPeriodRow) =>
                  parseFloat(row.total_mxn || "0")
                }
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#dashFill)"
                animationDuration={500}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {QUICK_LINKS.map((q, i) => (
          <Link
            key={q.href}
            href={q.href}
            style={{ "--i": i } as CSSProperties}
            className="motion-stagger hover-lift group flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)] transition-colors hover:border-[var(--accent)]"
          >
            <span className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full ${TONE_BG[q.tone]}`}
              >
                {q.icon}
              </span>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {t.nav[q.label]}
              </span>
            </span>
            <ArrowRight
              size={16}
              className="text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
