"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  DataTable,
  type Column,
  PageHeader,
  StatusBadge,
  ConfirmDialog,
  LoadingSpinner,
} from "@/components/ui";
import { suppliersApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import type { SupplierRead } from "@/types/index";
import { SupplierForm } from "./SupplierForm";

export function SuppliersManager() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierRead | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<SupplierRead | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canDelete = user?.role === "admin" || user?.role === "supervisor";

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => suppliersApi.list(token),
    enabled: !!token,
  });

  const deactivateMutation = useMutation({
    mutationFn: (supplier: SupplierRead) =>
      suppliersApi.update(token, supplier.id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setDeleteTarget(null);
    },
    onError: (err) => {
      setErrorMsg(err instanceof Error ? err.message : t.error.generic);
      setDeleteTarget(null);
    },
  });

  function openCreate() {
    setEditingSupplier(null);
    setFormOpen(true);
  }

  function openEdit(supplier: SupplierRead) {
    setEditingSupplier(supplier);
    setFormOpen(true);
  }

  function handleFormClose() {
    setFormOpen(false);
    setEditingSupplier(null);
  }

  function handleFormSuccess() {
    queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    handleFormClose();
  }

  const columns: Column<SupplierRead>[] = [
    {
      key: "name",
      header: t.suppliers.name,
      sortable: true,
      accessor: (row) => (
        <span className="font-medium text-[var(--text-primary)]">
          {row.name}
        </span>
      ),
    },
    {
      key: "contact_name",
      header: t.suppliers.contact_name,
      accessor: (row) => (
        <span className="text-[var(--text-secondary)]">
          {row.contact_name ?? (
            <span className="text-[var(--text-muted)]">—</span>
          )}
        </span>
      ),
    },
    {
      key: "email",
      header: t.suppliers.email,
      accessor: (row) => (
        <span className="text-[var(--text-secondary)]">
          {row.email ?? <span className="text-[var(--text-muted)]">—</span>}
        </span>
      ),
    },
    {
      key: "phone",
      header: t.suppliers.phone,
      accessor: (row) => (
        <span className="text-[var(--text-secondary)]">
          {row.phone ?? <span className="text-[var(--text-muted)]">—</span>}
        </span>
      ),
    },
    {
      key: "is_active",
      header: "Estado",
      accessor: (row) => (
        <StatusBadge status={row.is_active ? "active" : "inactive"} />
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      className: "w-24",
      accessor: (row) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            title={t.action.edit}
            onClick={() => openEdit(row)}
            className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card-elevated)] hover:text-[var(--text-primary)]"
          >
            <Pencil size={15} />
          </button>
          {canDelete && row.is_active && (
            <button
              type="button"
              title={t.action.delete}
              onClick={() => setDeleteTarget(row)}
              className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card-elevated)] hover:text-[var(--error)]"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t.nav.suppliers}
        action={{
          label: t.suppliers.add_supplier,
          icon: <Plus size={16} />,
          onClick: openCreate,
        }}
      />

      {errorMsg && (
        <div className="mb-4 rounded-lg border border-[var(--error)] bg-[var(--error-subtle)] px-4 py-3 text-sm text-[var(--error)]">
          {errorMsg}
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="ml-3 underline opacity-75 hover:opacity-100"
          >
            {t.action.close}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={suppliers ?? []}
          keyExtractor={(row) => row.id}
          emptyMessage="No hay proveedores registrados"
        />
      )}

      <SupplierForm
        isOpen={formOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        supplier={editingSupplier}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          deleteTarget && deactivateMutation.mutate(deleteTarget)
        }
        title="Desactivar proveedor"
        message={`¿Deseas desactivar a "${deleteTarget?.name}"? Podrás reactivarlo editándolo más tarde.`}
        confirmLabel="Desactivar"
        variant="warning"
        isLoading={deactivateMutation.isPending}
      />
    </div>
  );
}
