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

interface CustomerSalesRow {
  customer_id: string;
  full_name: string;
  purchase_count: number;
  total_mxn: string;
  loyalty_points: number;
}

export function CustomersReport() {
  const { token } = useAuth();
  const [dateFrom, setDateFrom] = useState(daysAgoISODate(29));
  const [dateTo, setDateTo] = useState(todayISODate());
  const [downloadingXls, setDownloadingXls] = useState(false);

  const {
    data = [],
    isLoading,
    error,
  } = useQuery<CustomerSalesRow[]>({
    queryKey: ["reports", "customers-sales", dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
      });
      const res = await fetch(`${API_BASE}/v1/reports/customers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json() as Promise<CustomerSalesRow[]>;
    },
    enabled: !!token,
  });

  const columns: Column<CustomerSalesRow>[] = [
    {
      key: "full_name",
      header: t.customers.name,
      accessor: (row) => row.full_name,
      sortable: true,
    },
    {
      key: "purchase_count",
      header: "# Compras",
      accessor: (row) => (
        <span className="tabular-nums">
          {row.purchase_count.toLocaleString("es-MX")}
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
    {
      key: "loyalty_points",
      header: t.customers.loyalty_points,
      accessor: (row) => (
        <span className="tabular-nums">
          {row.loyalty_points.toLocaleString("es-MX")}
        </span>
      ),
      className: "text-right",
      sortable: true,
    },
  ];

  async function handleDownloadExcel() {
    setDownloadingXls(true);
    try {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
      });
      await downloadFile(
        `${API_BASE}/v1/reports/customers/excel?${params}`,
        `clientes-${dateFrom}-${dateTo}.xlsx`,
        token,
      );
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

        <div className="ml-auto">
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

      {!isLoading && (
        <DataTable
          columns={columns}
          data={data}
          keyExtractor={(row) => row.customer_id}
          emptyMessage="Sin clientes con compras en el período seleccionado."
          pageSize={25}
        />
      )}
    </div>
  );
}
