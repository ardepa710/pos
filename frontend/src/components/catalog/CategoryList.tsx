"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { DataTable, ConfirmDialog } from "@/components/ui";
import type { Column } from "@/components/ui";
import { categoriesApi } from "@/lib/api";
import type { CategoryRead } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const INPUT_CLASS = cn(
  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)]",
  "px-3 py-2 text-sm text-[var(--text-primary)] outline-none",
  "placeholder:text-[var(--text-muted)]",
  "transition-colors focus:border-[var(--border-focus)]",
);

interface EditState {
  id: string;
  name: string;
  description: string;
}

export function CategoryList() {
  const { token, user } = useAuth();
  const qc = useQueryClient();

  const isAdmin = user?.role === "admin";
  const canEdit = user?.role === "admin" || user?.role === "supervisor";

  // Quick-add form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Inline edit state
  const [editState, setEditState] = useState<EditState | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<CategoryRead | null>(null);

  // Alert
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  function showAlert(type: "success" | "error", msg: string) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  }

  // Data
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list(token),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: () =>
      categoriesApi.create(token, {
        name: newName.trim(),
        description: newDesc.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setNewName("");
      setNewDesc("");
      showAlert("success", "Categoría creada correctamente.");
    },
    onError: (err: Error) => {
      showAlert("error", err.message || t.error.generic);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (state: EditState) =>
      categoriesApi.update(token, state.id, {
        name: state.name.trim(),
        description: state.description.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setEditState(null);
      showAlert("success", "Categoría actualizada correctamente.");
    },
    onError: (err: Error) => {
      showAlert("error", err.message || t.error.generic);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(token, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setDeleteTarget(null);
      showAlert("success", "Categoría eliminada correctamente.");
    },
    onError: (err: Error) => {
      setDeleteTarget(null);
      showAlert("error", err.message || t.error.generic);
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate();
  }

  function startEdit(cat: CategoryRead) {
    setEditState({
      id: cat.id,
      name: cat.name,
      description: cat.description ?? "",
    });
  }

  function cancelEdit() {
    setEditState(null);
  }

  function commitEdit() {
    if (!editState || !editState.name.trim()) return;
    updateMutation.mutate(editState);
  }

  const columns: Column<CategoryRead>[] = [
    {
      key: "name",
      header: t.suppliers.name,
      sortable: true,
      accessor: (row) => {
        if (editState?.id === row.id) {
          return (
            <input
              value={editState.name}
              onChange={(e) =>
                setEditState((s) => s && { ...s, name: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              autoFocus
              className={cn(INPUT_CLASS, "py-1")}
            />
          );
        }
        return (
          <span className="font-medium text-[var(--text-primary)]">
            {row.name}
          </span>
        );
      },
    },
    {
      key: "description",
      header: t.products.description,
      accessor: (row) => {
        if (editState?.id === row.id) {
          return (
            <input
              value={editState.description}
              onChange={(e) =>
                setEditState((s) => s && { ...s, description: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              placeholder="Descripción opcional"
              className={cn(INPUT_CLASS, "py-1")}
            />
          );
        }
        return (
          <span className="text-sm text-[var(--text-secondary)]">
            {row.description ?? "—"}
          </span>
        );
      },
    },
    {
      key: "product_count",
      header: "Productos",
      accessor: (row) => (
        <span className="tabular-nums text-sm text-[var(--text-secondary)]">
          {(row as CategoryRead & { product_count?: number }).product_count ??
            "—"}
        </span>
      ),
      className: "text-center w-24",
    },
    {
      key: "actions",
      header: "",
      accessor: (row) => {
        if (editState?.id === row.id) {
          return (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                title="Guardar"
                onClick={commitEdit}
                disabled={updateMutation.isPending}
                className="rounded p-1.5 text-[var(--success)] transition-colors hover:bg-[var(--bg-card-elevated)] disabled:opacity-50"
              >
                <Check size={15} />
              </button>
              <button
                type="button"
                title="Cancelar"
                onClick={cancelEdit}
                className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card-elevated)] hover:text-[var(--text-primary)]"
              >
                <X size={15} />
              </button>
            </div>
          );
        }

        return (
          <div className="flex items-center justify-end gap-1">
            {canEdit && (
              <button
                type="button"
                title={t.action.edit}
                onClick={() => startEdit(row)}
                className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card-elevated)] hover:text-[var(--text-primary)]"
              >
                <Pencil size={15} />
              </button>
            )}
            {isAdmin && (
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
        );
      },
      className: "w-24",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Alert banner */}
      {alert && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            alert.type === "success"
              ? "border-[var(--success)] bg-[var(--success-subtle)] text-[var(--success)]"
              : "border-[var(--error)] bg-[var(--error-subtle)] text-[var(--error)]",
          )}
        >
          {alert.msg}
        </div>
      )}

      {/* Quick-add form */}
      {canEdit && (
        <form
          onSubmit={handleCreate}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              Nombre <span className="text-[var(--error)]">*</span>
            </label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nueva categoría…"
              className={cn(INPUT_CLASS, "w-52")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              {t.products.description}
            </label>
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Descripción opcional"
              className={cn(INPUT_CLASS, "w-64")}
            />
          </div>

          <button
            type="submit"
            disabled={!newName.trim() || createMutation.isPending}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
              "bg-[var(--accent)] text-white transition-colors hover:bg-[var(--accent-hover)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <Plus size={15} aria-hidden />
            Agregar categoría
          </button>
        </form>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={categories}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No hay categorías"
      />

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Eliminar categoría"
        message={`¿Seguro que deseas eliminar "${deleteTarget?.name}"? Los productos asignados perderán su categoría.`}
        confirmLabel={t.action.delete}
        cancelLabel={t.action.cancel}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
