"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown } from "lucide-react";
import { DataTable, type Column, LoadingSpinner } from "@/components/ui";
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

interface InventoryRow {
  sku: string;
  name: string;
  category_name?: string;
  stock: number;
  min_stock: number;
  track_inventory: boolean;
}

type StockStatus = "ok" | "low" | "out";

function getStockStatus(row: InventoryRow): StockStatus {
  if (!row.track_inventory) return "ok";
  if (row.stock <= 0) return "out";
  if (row.stock <= row.min_stock) return "low";
  return "ok";
}

function StockStatusBadge({ status }: { status: StockStatus }) {
  const map: Record<StockStatus, { label: string; className: string }> = {
    ok: {
      label: t.status.active,
      className: "bg-[var(--success-subtle)] text-[var(--success)]",
    },
    low: {
      label: t.status.low_stock,
      className: "bg-[var(--warning-subtle)] text-[var(--warning)]",
    },
    out: {
      label: t.status.out_of_stock,
      className: "bg-[var(--error-subtle)] text-[var(--error)]",
    },
  };
  const { label, className } = map[status];
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function InventoryReport() {
  const { token } = useAuth();
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingXls, setDownloadingXls] = useState(false);

  const {
    data = [],
    isLoading,
    error,
  } = useQuery<InventoryRow[]>({
    queryKey: ["reports", "inventory"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/v1/reports/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json() as Promise<InventoryRow[]>;
    },
    enabled: !!token,
  });

  const filtered = lowStockOnly
    ? data.filter((r) => {
        const s = getStockStatus(r);
        return s === "low" || s === "out";
      })
    : data;

  const columns: Column<InventoryRow>[] = [
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
      key: "category_name",
      header: t.products.category,
      accessor: (row) => row.category_name ?? "—",
      sortable: true,
    },
    {
      key: "stock",
      header: t.products.stock,
      accessor: (row) => (
        <span className="tabular-nums">
          {row.stock.toLocaleString("es-MX")}
        </span>
      ),
      className: "text-right",
      sortable: true,
    },
    {
      key: "min_stock",
      header: t.products.min_stock,
      accessor: (row) => (
        <span className="tabular-nums">
          {row.min_stock.toLocaleString("es-MX")}
        </span>
      ),
      className: "text-right",
      sortable: true,
    },
    {
      key: "status",
      header: "Estado",
      accessor: (row) => <StockStatusBadge status={getStockStatus(row)} />,
    },
  ];

  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    try {
      await downloadFile(
        `${API_BASE}/v1/reports/inventory/pdf`,
        "inventario.pdf",
        token,
      );
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleDownloadExcel() {
    setDownloadingXls(true);
    try {
      await downloadFile(
        `${API_BASE}/v1/reports/inventory/excel`,
        "inventario.xlsx",
        token,
      );
    } finally {
      setDownloadingXls(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
          />
          Solo stock bajo / sin stock
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={!filtered.length || downloadingPdf}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg-card-elevated)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileDown size={15} />
            PDF
          </button>
          <button
            type="button"
            onClick={handleDownloadExcel}
            disabled={!filtered.length || downloadingXls}
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
          data={filtered}
          keyExtractor={(row) => row.sku}
          emptyMessage="Sin productos en inventario."
          pageSize={25}
        />
      )}
    </div>
  );
}
