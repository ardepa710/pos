"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Banknote,
  CreditCard,
  Gift,
  FileDown,
} from "lucide-react";
import {
  DataTable,
  type Column,
  LoadingSpinner,
  CurrencyDisplay,
} from "@/components/ui";
import { reportsApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import type { DailySummary } from "@/types/index";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

async function downloadFile(url: string, filename: string, token: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  iconBg?: string;
}

function KpiCard({
  icon,
  label,
  value,
  iconBg = "bg-[var(--accent-subtle)]",
}: KpiCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
          iconBg,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-[var(--text-secondary)]">{label}</p>
        <p className="mt-0.5 text-xl font-semibold text-[var(--text-primary)] tabular-nums">
          {value}
        </p>
      </div>
    </div>
  );
}

interface PaymentRow {
  method: string;
  label: string;
  amount: string;
  icon: React.ReactNode;
}

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  cash_mxn: <Banknote size={16} className="text-[var(--success)]" />,
  cash_usd: <DollarSign size={16} className="text-[var(--success)]" />,
  credit_card: <CreditCard size={16} className="text-[var(--accent)]" />,
  debit_card: <CreditCard size={16} className="text-[var(--info)]" />,
  gift_card: <Gift size={16} className="text-[var(--warning)]" />,
  transfer: <TrendingUp size={16} className="text-[var(--text-secondary)]" />,
};

const PAYMENT_LABELS: Record<string, string> = {
  cash_mxn: t.payment.cash_mxn,
  cash_usd: t.payment.cash_usd,
  credit_card: t.payment.credit_card,
  debit_card: t.payment.debit_card,
  gift_card: t.payment.gift_card,
  transfer: t.payment.transfer,
};

export function DailyReport() {
  const { token } = useAuth();
  const [date, setDate] = useState(todayISODate());
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, error } = useQuery<DailySummary>({
    queryKey: ["reports", "daily", date],
    queryFn: () => reportsApi.daily(token, date),
    enabled: !!token,
  });

  const topProductColumns: Column<DailySummary["top_products"][number]>[] = [
    {
      key: "name",
      header: t.products.name,
      accessor: (row) => row.name,
      sortable: true,
    },
    {
      key: "qty",
      header: t.sales.quantity,
      accessor: (row) => (
        <span className="tabular-nums">
          {parseFloat(row.qty).toLocaleString("es-MX")}
        </span>
      ),
      className: "text-right",
      sortable: true,
    },
    {
      key: "revenue",
      header: "Ingresos",
      accessor: (row) => <CurrencyDisplay amount={row.revenue} />,
      className: "text-right",
    },
  ];

  const paymentRows: PaymentRow[] = data
    ? Object.entries(data.payment_breakdown ?? {})
        .filter(([, amt]) => parseFloat(String(amt)) > 0)
        .map(([method, amount]) => ({
          method,
          label: PAYMENT_LABELS[method] ?? method,
          amount: String(amount),
          icon: PAYMENT_ICONS[method] ?? <DollarSign size={16} />,
        }))
    : [];

  async function handleDownloadPdf() {
    if (!data) return;
    setDownloading(true);
    try {
      const url = `${API_BASE}/v1/reports/daily/pdf?date=${date}`;
      await downloadFile(url, `reporte-diario-${date}.pdf`, token);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Date picker + download */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            {t.reports.date_from}
          </label>
          <input
            type="date"
            value={date}
            max={todayISODate()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]"
          />
        </div>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={!data || downloading}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium transition",
            "hover:bg-[var(--bg-card-elevated)] active:scale-[0.96] disabled:active:scale-100 disabled:opacity-40 disabled:cursor-not-allowed",
          )}
        >
          <FileDown size={16} />
          {downloading ? t.action.loading : t.reports.download_pdf}
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <LoadingSpinner />
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-[var(--error-subtle)] bg-[var(--error-subtle)] px-4 py-3 text-sm text-[var(--error)]">
          {t.error.generic}
        </p>
      )}

      {data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              icon={<ShoppingCart size={20} className="text-[var(--accent)]" />}
              label="# Ventas"
              value={data.total_sales.toLocaleString("es-MX")}
            />
            <KpiCard
              icon={<TrendingUp size={20} className="text-[var(--success)]" />}
              iconBg="bg-[var(--success-subtle)]"
              label={`Total ${t.currency.mxn}`}
              value={
                <CurrencyDisplay amount={data.total_revenue_mxn} size="lg" />
              }
            />
            <KpiCard
              icon={<DollarSign size={20} className="text-[var(--warning)]" />}
              iconBg="bg-[var(--warning-subtle)]"
              label={`Total ${t.currency.usd}`}
              value={
                <CurrencyDisplay
                  amount={data.total_revenue_usd}
                  currency="USD"
                  size="lg"
                />
              }
            />
            <KpiCard
              icon={<Banknote size={20} className="text-[var(--info)]" />}
              iconBg="bg-[var(--info-subtle)]"
              label={t.payment.cash_mxn}
              value={<CurrencyDisplay amount={data.cash_total} size="lg" />}
            />
          </div>

          {/* Payment breakdown */}
          {paymentRows.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
                {t.payment.method}
              </h3>
              <div className="flex flex-col gap-2">
                {paymentRows.map((row) => (
                  <div
                    key={row.method}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      {row.icon}
                      {row.label}
                    </span>
                    <CurrencyDisplay amount={row.amount} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top 10 products */}
          {data.top_products.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
                {t.reports.products} — Top 10
              </h3>
              <DataTable
                columns={topProductColumns}
                data={data.top_products.slice(0, 10)}
                keyExtractor={(row) => row.name}
                pageSize={10}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
