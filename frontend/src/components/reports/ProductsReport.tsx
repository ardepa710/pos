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
import { categoriesApi } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import type { CategoryRead } from "@/types/index";

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

interface ProductSalesRow {
  product_id: string;
  sku: string;
  name: string;
  quantity_sold: string;
  revenue_mxn: string;
  stock_current: string;
}

export function ProductsReport() {
  const { token } = useAuth();
  const [dateFrom, setDateFrom] = useState(daysAgoISODate(29));
  const [dateTo, setDateTo] = useState(todayISODate());
  const [categoryId, setCategoryId] = useState("");
  const [downloadingXls, setDownloadingXls] = useState(false);

  const { data: categories = [] } = useQuery<CategoryRead[]>({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list(token),
    enabled: !!token,
  });

  const {
    data = [],
    isLoading,
    error,
  } = useQuery<ProductSalesRow[]>({
    queryKey: ["reports", "products-sales", dateFrom, dateTo, categoryId],
    queryFn: async () => {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
      });
      if (categoryId) params.set("category_id", categoryId);
      const res = await fetch(`${API_BASE}/v1/reports/products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json() as Promise<ProductSalesRow[]>;
    },
    enabled: !!token,
  });

  const columns: Column<ProductSalesRow>[] = [
    {
      key: "sku",
      header: t.products.sku,
      accessor: (row) => (
        <span className="font-mono text-xs text-[var(--text-secondary)]">
          {row.sku}
        </span>
      ),
      sortable: true,
    },
    {
      key: "name",
      header: t.products.name,
      accessor: (row) => row.name,
      sortable: true,
    },
    {
      key: "quantity_sold",
      header: "Cantidad vendida",
      accessor: (row) => (
        <span className="tabular-nums">
          {parseFloat(row.quantity_sold).toLocaleString("es-MX")}
        </span>
      ),
      className: "text-right",
      sortable: true,
    },
    {
      key: "revenue_mxn",
      header: `Ingresos ${t.currency.mxn}`,
      accessor: (row) => <CurrencyDisplay amount={row.revenue_mxn} />,
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
      if (categoryId) params.set("category_id", categoryId);
      await downloadFile(
        `${API_BASE}/v1/reports/products/excel?${params}`,
        `productos-${dateFrom}-${dateTo}.xlsx`,
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

        {categories.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              {t.products.category}
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]"
            >
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

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
          keyExtractor={(row) => row.product_id}
          emptyMessage="Sin ventas en el período seleccionado."
          pageSize={25}
        />
      )}
    </div>
  );
}
