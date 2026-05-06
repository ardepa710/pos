"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown } from "lucide-react";
import {
  DataTable,
  type Column,
  LoadingSpinner,
  CurrencyDisplay,
} from "@/components/ui";
import { t } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
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

function daysAgoISODate(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

type GroupBy = "day" | "week" | "month";

interface SalesPeriodRow {
  period: string;
  sale_count: number;
  total_mxn: string;
}

export function SalesReport() {
  const { token } = useAuth();
  const [dateFrom, setDateFrom] = useState(daysAgoISODate(29));
  const [dateTo, setDateTo] = useState(todayISODate());
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingXls, setDownloadingXls] = useState(false);

  const {
    data = [],
    isLoading,
    error,
  } = useQuery<SalesPeriodRow[]>({
    queryKey: ["reports", "sales-period", dateFrom, dateTo, groupBy],
    queryFn: async () => {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
        group_by: groupBy,
      });
      const res = await fetch(`${API_BASE}/v1/reports/sales?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json() as Promise<SalesPeriodRow[]>;
    },
    enabled: !!token,
  });

  const maxTotal = Math.max(
    ...data.map((r) => parseFloat(r.total_mxn || "0")),
    1,
  );

  const columns: Column<SalesPeriodRow>[] = [
    {
      key: "period",
      header: "Período",
      accessor: (row) => row.period,
      sortable: true,
    },
    {
      key: "sale_count",
      header: "# Ventas",
      accessor: (row) => (
        <span className="tabular-nums">
          {row.sale_count.toLocaleString("es-MX")}
        </span>
      ),
      className: "text-right",
      sortable: true,
    },
    {
      key: "total_mxn",
      header: `Total ${t.currency.mxn}`,
      accessor: (row) => <CurrencyDisplay amount={row.total_mxn} />,
      className: "text-right",
      sortable: true,
    },
  ];

  const GROUP_OPTIONS: { key: GroupBy; label: string }[] = [
    { key: "day", label: t.reports.period.day },
    { key: "week", label: t.reports.period.week },
    { key: "month", label: t.reports.period.month },
  ];

  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    try {
      const url = `${API_BASE}/v1/reports/sales/pdf?date_from=${dateFrom}&date_to=${dateTo}&group_by=${groupBy}`;
      await downloadFile(url, `ventas-${dateFrom}-${dateTo}.pdf`, token);
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleDownloadExcel() {
    setDownloadingXls(true);
    try {
      const url = `${API_BASE}/v1/reports/sales/excel?date_from=${dateFrom}&date_to=${dateTo}&group_by=${groupBy}`;
      await downloadFile(url, `ventas-${dateFrom}-${dateTo}.xlsx`, token);
    } finally {
      setDownloadingXls(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            {t.reports.date_from}
          </label>
          <input
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            {t.reports.date_to}
          </label>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            max={todayISODate()}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]"
          />
        </div>

        {/* Group by radio */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Agrupar por
          </span>
          <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-0.5">
            {GROUP_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setGroupBy(opt.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  groupBy === opt.key
                    ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Download buttons */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={!data.length || downloadingPdf}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg-card-elevated)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileDown size={15} />
            PDF
          </button>
          <button
            type="button"
            onClick={handleDownloadExcel}
            disabled={!data.length || downloadingXls}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg-card-elevated)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileDown size={15} />
            Excel
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <LoadingSpinner />
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-[var(--error-subtle)] px-4 py-3 text-sm text-[var(--error)]">
          {t.error.generic}
        </p>
      )}

      {!isLoading && data.length > 0 && (
        <>
          {/* CSS bar chart */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
              {t.reports.total_revenue} — {t.currency.mxn}
            </h3>
            <div
              className="flex items-end gap-1 overflow-x-auto pb-1"
              style={{ minHeight: 120 }}
            >
              {data.map((row) => {
                const heightPct =
                  (parseFloat(row.total_mxn || "0") / maxTotal) * 100;
                return (
                  <div
                    key={row.period}
                    className="group relative flex min-w-[28px] flex-1 flex-col items-center gap-1"
                  >
                    {/* Value tooltip on hover */}
                    <span className="absolute -top-5 hidden text-xs font-semibold text-[var(--accent)] group-hover:block whitespace-nowrap">
                      $
                      {parseFloat(row.total_mxn).toLocaleString("es-MX", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                    <div
                      className="w-full rounded-t bg-[var(--accent)] transition-all hover:bg-[var(--accent-hover)]"
                      style={{
                        height: `${Math.max(heightPct, 4)}px`,
                        maxHeight: 100,
                      }}
                    />
                    <span className="truncate text-[10px] text-[var(--text-muted)] w-full text-center">
                      {row.period.length > 6 ? row.period.slice(5) : row.period}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <DataTable
            columns={columns}
            data={data}
            keyExtractor={(row) => row.period}
            pageSize={31}
          />
        </>
      )}

      {!isLoading && !error && data.length === 0 && (
        <p className="py-10 text-center text-sm text-[var(--text-muted)]">
          Sin ventas en el período seleccionado.
        </p>
      )}
    </div>
  );
}
