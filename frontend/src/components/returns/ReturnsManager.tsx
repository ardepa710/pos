"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus } from "lucide-react";
import {
  PageHeader,
  DataTable,
  type Column,
  CurrencyDisplay,
  StatusBadge,
} from "@/components/ui";
import { ReturnForm } from "./ReturnForm";
import { ReturnDetail } from "./ReturnDetail";
import { returnsApi } from "@/lib/api";
import type { ReturnRead } from "@/types/index";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

const REFUND_METHOD_LABELS: Record<string, string> = {
  cash: t.returns.refund.cash,
  gift_card: t.returns.refund.gift_card,
  store_credit: t.returns.refund.store_credit,
};

export function ReturnsManager() {
  const { token } = useAuth();

  const [returns, setReturns] = useState<ReturnRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [detailRecord, setDetailRecord] = useState<ReturnRead | null>(null);

  const loadReturns = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await returnsApi.list(token);
      setReturns(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t.error.generic);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  function handleCreated(ret: ReturnRead) {
    setReturns((prev) => [ret, ...prev]);
  }

  const columns: Column<ReturnRead>[] = [
    {
      key: "folio",
      header: t.returns.folio,
      sortable: true,
      accessor: (row) => (
        <span className="font-mono text-xs font-medium text-[var(--text-primary)]">
          {row.folio}
        </span>
      ),
    },
    {
      key: "original_sale_id",
      header: t.returns.original_sale,
      accessor: (row) => (
        <span className="font-mono text-xs text-[var(--text-muted)]">
          {row.original_sale_id}
        </span>
      ),
    },
    {
      key: "total_returned_mxn",
      header: t.returns.total_returned,
      sortable: true,
      accessor: (row) => <CurrencyDisplay amount={row.total_returned_mxn} />,
    },
    {
      key: "refund_method",
      header: t.returns.refund_method,
      accessor: (row) => (
        <span className="text-sm text-[var(--text-primary)]">
          {REFUND_METHOD_LABELS[row.refund_method] ?? row.refund_method}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      accessor: () => <StatusBadge status="refunded" size="sm" />,
    },
    {
      key: "created_at",
      header: "Fecha",
      sortable: true,
      accessor: (row) => (
        <span className="text-xs text-[var(--text-muted)]">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      accessor: (row) => (
        <button
          type="button"
          onClick={() => setDetailRecord(row)}
          className="rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-card-elevated)] transition-colors"
        >
          {t.action.view}
        </button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t.nav.returns}
        action={{
          label: t.returns.new_return,
          onClick: () => setShowForm(true),
          icon: <Plus size={15} aria-hidden />,
        }}
      />

      {loadError && (
        <p className="mb-4 text-sm text-[var(--error)]">{loadError}</p>
      )}

      <DataTable
        columns={columns}
        data={returns}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No hay devoluciones registradas."
        pageSize={20}
      />

      <ReturnForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onCreated={handleCreated}
      />

      <ReturnDetail
        isOpen={detailRecord !== null}
        onClose={() => setDetailRecord(null)}
        returnRecord={detailRecord}
      />
    </div>
  );
}
