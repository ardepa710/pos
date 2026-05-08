"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, DollarSign } from "lucide-react";
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
import { ConsignmentInForm } from "./ConsignmentInForm";
import { ConsignmentSettleForm } from "./ConsignmentSettleForm";

export function ConsignmentList() {
  const { token, user } = useAuth();
  const [consignments, setConsignments] = useState<PurchaseRead[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInForm, setShowInForm] = useState(false);
  const [settleTarget, setSettleTarget] = useState<PurchaseRead | null>(null);

  const canCreate = user?.role === "admin" || user?.role === "supervisor";

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await purchasesApi.list(token, {
        purchase_type: "consignment_in",
      });
      setConsignments(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error.generic);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

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
            {supplier?.legal_name ?? row.supplier_id}
          </span>
        );
      },
    },
    {
      key: "created_at",
      header: "Fecha",
      sortable: true,
      accessor: (row) => (
        <span className="tabular-nums text-sm text-[var(--text-secondary)]">
          {new Date(row.created_at).toLocaleDateString("es-MX")}
        </span>
      ),
    },
    {
      key: "total",
      header: "Valor consignado",
      sortable: true,
      className: "text-right",
      accessor: (row) => <CurrencyDisplay amount={row.total} size="sm" />,
    },
    {
      key: "status",
      header: "Estado",
      accessor: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      key: "actions",
      header: "",
      className: "w-28",
      accessor: (row) =>
        row.status === "received" || row.status === "pending" ? (
          <button
            type="button"
            onClick={() => setSettleTarget(row)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--accent)] px-2.5 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-colors"
          >
            <DollarSign size={13} />
            {t.purchases.settle}
          </button>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">—</span>
        ),
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Consignaciones"
          subtitle="Mercancía recibida en consignación"
          action={
            canCreate
              ? {
                  label: "Nueva consignación",
                  onClick: () => setShowInForm(true),
                  icon: <Plus size={16} />,
                }
              : undefined
          }
        />

        {error && (
          <p className="rounded-lg border border-[var(--error)] bg-[var(--error-subtle)] px-4 py-3 text-sm text-[var(--error)]">
            {error}
          </p>
        )}

        <DataTable
          columns={columns}
          data={consignments}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage="No hay consignaciones registradas"
        />
      </div>

      {showInForm && (
        <ConsignmentInForm
          suppliers={suppliers}
          onClose={() => setShowInForm(false)}
          onSuccess={() => {
            setShowInForm(false);
            load();
          }}
        />
      )}

      {settleTarget && (
        <ConsignmentSettleForm
          consignment={settleTarget}
          suppliers={suppliers}
          onClose={() => setSettleTarget(null)}
          onSuccess={() => {
            setSettleTarget(null);
            load();
          }}
        />
      )}
    </>
  );
}
