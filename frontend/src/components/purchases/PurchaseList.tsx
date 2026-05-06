"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Eye } from "lucide-react";
import { t } from "@/lib/i18n";
import { purchasesApi, suppliersApi } from "@/lib/api";
import type { PurchaseRead, SupplierRead } from "@/types/index";
import { useAuth } from "@/hooks/useAuth";
import {
  DataTable,
  type Column,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { CurrencyDisplay } from "@/components/ui";
import { PurchaseForm } from "./PurchaseForm";
import { PurchaseDetail } from "./PurchaseDetail";

export function PurchaseList() {
  const { token, user } = useAuth();
  const [purchases, setPurchases] = useState<PurchaseRead[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supplierFilter, setSupplierFilter] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [detailPurchase, setDetailPurchase] = useState<PurchaseRead | null>(
    null,
  );

  const canCreate = user?.role === "admin" || user?.role === "supervisor";

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { purchase_type: "normal" };
      if (supplierFilter) params.supplier_id = supplierFilter;
      const data = await purchasesApi.list(token, params);
      setPurchases(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error.generic);
    } finally {
      setIsLoading(false);
    }
  }, [token, supplierFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    suppliersApi
      .list(token)
      .then(setSuppliers)
      .catch(() => {});
  }, [token]);

  const columns: Column<PurchaseRead>[] = [
    {
      key: "folio",
      header: t.purchases.folio,
      sortable: true,
      accessor: (row) => (
        <span className="font-mono text-xs text-[var(--text-secondary)]">
          {row.folio}
        </span>
      ),
    },
    {
      key: "supplier",
      header: t.purchases.supplier,
      sortable: true,
      accessor: (row) => {
        const supplier = suppliers.find((s) => s.id === row.supplier_id);
        return (
          <span className="text-[var(--text-primary)]">
            {supplier?.name ?? row.supplier_id}
          </span>
        );
      },
    },
    {
      key: "created_at",
      header: "Fecha",
      sortable: true,
      accessor: (row) => (
        <span className="text-[var(--text-secondary)] tabular-nums text-sm">
          {new Date(row.created_at).toLocaleDateString("es-MX")}
        </span>
      ),
    },
    {
      key: "purchase_type",
      header: "Tipo",
      accessor: (row) => (
        <span className="text-sm text-[var(--text-secondary)]">
          {row.purchase_type === "consignment_in"
            ? t.purchases.consignment
            : "Normal"}
        </span>
      ),
    },
    {
      key: "total_cost_mxn",
      header: t.purchases.total_cost,
      sortable: true,
      className: "text-right",
      accessor: (row) => (
        <CurrencyDisplay amount={row.total_cost_mxn} size="sm" />
      ),
    },
    {
      key: "status",
      header: "Estado",
      accessor: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      key: "actions",
      header: "",
      className: "w-20",
      accessor: (row) => (
        <button
          type="button"
          onClick={() => setDetailPurchase(row)}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-card-elevated)] transition-colors"
          title={t.action.view}
        >
          <Eye size={13} />
          {t.action.view}
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Compras"
          subtitle="Registro de entradas de mercancía"
          action={
            canCreate
              ? {
                  label: t.purchases.new_purchase,
                  onClick: () => setShowForm(true),
                  icon: <Plus size={16} />,
                }
              : undefined
          }
        />

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] min-w-[200px]"
          >
            <option value="">Todos los proveedores</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="rounded-lg border border-[var(--error)] bg-[var(--error-subtle)] px-4 py-3 text-sm text-[var(--error)]">
            {error}
          </p>
        )}

        <DataTable
          columns={columns}
          data={purchases}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage="No hay compras registradas"
        />
      </div>

      {showForm && (
        <PurchaseForm
          suppliers={suppliers}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {detailPurchase && (
        <PurchaseDetail
          purchase={detailPurchase}
          suppliers={suppliers}
          onClose={() => setDetailPurchase(null)}
        />
      )}
    </>
  );
}
