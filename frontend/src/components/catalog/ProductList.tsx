"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, BarChart2 } from "lucide-react";
import {
  DataTable,
  SearchInput,
  StatusBadge,
  ConfirmDialog,
  CurrencyDisplay,
} from "@/components/ui";
import type { Column } from "@/components/ui";
import { ProductForm } from "./ProductForm";
import { StockAdjustModal } from "./StockAdjustModal";
import { productsApi, categoriesApi } from "@/lib/api";
import type { ProductRead } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function ProductList() {
  const { token, user } = useAuth();
  const qc = useQueryClient();

  const isAdmin = user?.role === "admin";
  const canEdit = user?.role === "admin" || user?.role === "supervisor";

  // Filters
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductRead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductRead | null>(null);
  const [stockTarget, setStockTarget] = useState<ProductRead | null>(null);

  // Alert banner
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  function showAlert(type: "success" | "error", msg: string) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  }

  // Data
  const { data, isLoading } = useQuery({
    queryKey: ["products", search, categoryId, page],
    queryFn: () =>
      productsApi.list(token, {
        search: search || undefined,
        category_id: categoryId || undefined,
        skip: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
      }),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list(token),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(token, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      setDeleteTarget(null);
      showAlert("success", "Producto eliminado correctamente.");
    },
    onError: (err: Error) => {
      setDeleteTarget(null);
      showAlert("error", err.message || t.error.generic);
    },
  });

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, []);

  function openCreate() {
    setEditProduct(null);
    setFormOpen(true);
  }

  function openEdit(product: ProductRead) {
    setEditProduct(product);
    setFormOpen(true);
  }

  // Table columns
  const columns: Column<ProductRead>[] = [
    {
      key: "sku",
      header: t.products.sku,
      sortable: true,
      accessor: (row) => (
        <span className="font-mono text-xs text-[var(--text-secondary)]">
          {row.sku}
        </span>
      ),
    },
    {
      key: "name",
      header: t.products.name,
      sortable: true,
      accessor: (row) => (
        <span className="font-medium text-[var(--text-primary)]">
          {row.name}
        </span>
      ),
    },
    {
      key: "category",
      header: t.products.category,
      accessor: (row) => (
        <span className="text-[var(--text-secondary)]">
          {row.category?.name ?? "—"}
        </span>
      ),
    },
    {
      key: "price",
      header: t.products.price_general,
      sortable: true,
      accessor: (row) => (
        <CurrencyDisplay amount={row.price_general} size="sm" />
      ),
      className: "text-right",
    },
    {
      key: "stock",
      header: t.products.stock,
      accessor: (row) => {
        if (!row.track_inventory) {
          return (
            <span className="text-xs text-[var(--text-muted)]">
              Sin inventario
            </span>
          );
        }
        const stockNum = parseFloat(String(row.stock_quantity));
        const isLow =
          row.reorder_point !== undefined &&
          row.reorder_point !== null &&
          stockNum < parseFloat(String(row.reorder_point));
        return (
          <span
            className={cn(
              "tabular-nums text-sm font-medium",
              isLow ? "text-[var(--warning)]" : "text-[var(--text-primary)]",
            )}
          >
            {stockNum}
            {isLow && <span className="ml-1 text-xs">⚠</span>}
          </span>
        );
      },
      className: "text-center",
    },
    {
      key: "status",
      header: "Estado",
      accessor: (row) => (
        <StatusBadge status={row.is_active ? "active" : "inactive"} size="sm" />
      ),
    },
    {
      key: "actions",
      header: "",
      accessor: (row) => (
        <div className="flex items-center justify-end gap-1">
          {canEdit && row.track_inventory && (
            <button
              type="button"
              title="Ajustar stock"
              onClick={() => setStockTarget(row)}
              className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card-elevated)] hover:text-[var(--accent)]"
            >
              <BarChart2 size={15} />
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              title={t.action.edit}
              onClick={() => openEdit(row)}
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
      ),
      className: "w-32",
    },
  ];

  const products = data?.items ?? [];
  const total = data?.total ?? 0;

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

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          placeholder={t.products.search_placeholder}
          onSearch={handleSearch}
          className="w-64"
        />

        {/* Category filter */}
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
          className={cn(
            "rounded-lg border border-[var(--border)] bg-[var(--bg-input)]",
            "px-3 py-2 text-sm text-[var(--text-primary)] outline-none",
            "transition-colors focus:border-[var(--border-focus)]",
          )}
        >
          <option value="">Todas las categorías</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        {canEdit && (
          <button
            type="button"
            onClick={openCreate}
            className={cn(
              "ml-auto inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
              "bg-[var(--accent)] text-white transition hover:bg-[var(--accent-hover)] active:scale-[0.96]",
            )}
          >
            <Plus size={15} aria-hidden />
            {t.products.add_product}
          </button>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={products}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage={t.products.no_products}
        pageSize={PAGE_SIZE}
        totalCount={total}
        currentPage={page}
        onPageChange={setPage}
      />

      {/* Product form modal */}
      {formOpen && (
        <ProductForm
          product={editProduct}
          categories={categories ?? []}
          onClose={() => setFormOpen(false)}
          onSuccess={(msg) => {
            setFormOpen(false);
            showAlert("success", msg);
            qc.invalidateQueries({ queryKey: ["products"] });
          }}
          onError={(msg) => showAlert("error", msg)}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Eliminar producto"
        message={`¿Seguro que deseas eliminar "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel={t.action.delete}
        cancelLabel={t.action.cancel}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* Stock adjust modal */}
      {stockTarget && (
        <StockAdjustModal
          product={stockTarget}
          onClose={() => setStockTarget(null)}
          onSuccess={(msg) => {
            setStockTarget(null);
            showAlert("success", msg);
            qc.invalidateQueries({ queryKey: ["products"] });
          }}
          onError={(msg) => showAlert("error", msg)}
        />
      )}
    </div>
  );
}
