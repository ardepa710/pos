"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { productsApi, categoriesApi } from "@/lib/api";
import type { ProductRead } from "@/lib/api";
import { formatMXN } from "@/lib/currency";
import { SearchInput, LoadingSpinner } from "@/components/ui";

interface ProductGridProps {
  token: string;
  onAddItem: (product: ProductRead) => void;
}

type FlashState = Record<string, boolean>;

export function ProductGrid({ token, onAddItem }: ProductGridProps) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [flash, setFlash] = useState<FlashState>({});

  const { data: categories } = useQuery({
    queryKey: ["categories", token],
    queryFn: () => categoriesApi.list(token),
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["pos-products", token, search, categoryId],
    queryFn: () =>
      productsApi.list(token, {
        search: search || undefined,
        category_id: categoryId ?? undefined,
        limit: 80,
      }),
    staleTime: 30 * 1000,
  });

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
  }, []);

  function handleAdd(product: ProductRead) {
    if (
      product.track_inventory &&
      parseFloat(String(product.stock_quantity)) <= 0
    )
      return;

    // Visual flash feedback
    setFlash((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setFlash((prev) => ({ ...prev, [product.id]: false }));
    }, 400);

    onAddItem(product);
  }

  const products: ProductRead[] = data?.items ?? [];

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Search */}
      <SearchInput
        placeholder={t.sales.search_product}
        onSearch={handleSearch}
        debounceMs={250}
      />

      {/* Category filter */}
      {categories && categories.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setCategoryId(null)}
            className={cn(
              "flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium",
              "transition-colors",
              categoryId === null
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)] bg-[var(--bg-card-elevated)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
            )}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() =>
                setCategoryId(cat.id === categoryId ? null : cat.id)
              }
              className={cn(
                "flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium",
                "transition-colors",
                categoryId === cat.id
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--border)] bg-[var(--bg-card-elevated)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Product grid */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertCircle size={32} className="text-[var(--error)]" />
            <p className="text-sm text-[var(--text-muted)]">
              {t.error.network}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-sm text-[var(--accent)] underline underline-offset-2"
            >
              {t.action.retry}
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Package size={32} className="text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">
              {t.products.no_products}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 pb-2 lg:grid-cols-3">
            {products.map((product) => {
              const stockNum = parseFloat(String(product.stock_quantity));
              const outOfStock = product.track_inventory && stockNum <= 0;
              const lowStock =
                product.track_inventory && stockNum > 0 && stockNum <= 5;
              const isFlashing = flash[product.id];

              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={outOfStock}
                  onClick={() => handleAdd(product)}
                  className={cn(
                    "relative flex flex-col rounded-xl border p-3 text-left",
                    "bg-[var(--product-card-bg)] shadow-[var(--shadow-card)]",
                    "transition-all duration-150",
                    outOfStock
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer hover:border-[var(--accent)] hover:shadow-[var(--shadow-elevated)] active:scale-[0.97]",
                    isFlashing
                      ? "border-[var(--success)] bg-[var(--success-subtle)] scale-[0.97]"
                      : "border-[var(--border)]",
                  )}
                >
                  {/* Stock badge — only shown when out-of-stock or low stock */}
                  {product.track_inventory && (outOfStock || lowStock) && (
                    <div
                      className={cn(
                        "absolute bottom-0 left-0 right-0 rounded-b-xl px-2 py-0.5 text-center text-[10px] font-semibold text-white",
                        outOfStock
                          ? "bg-[var(--error)]"
                          : "bg-[var(--warning)]",
                      )}
                    >
                      {outOfStock
                        ? t.sales.out_of_stock
                        : `${stockNum} disponibles`}
                    </div>
                  )}

                  {/* Consignment badge */}
                  {product.is_consigned && (
                    <span className="mb-1 self-start rounded-sm bg-[var(--info-subtle)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--info)]">
                      {t.sales.consignment_badge}
                    </span>
                  )}

                  {/* Name */}
                  <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)]">
                    {product.name}
                  </p>

                  {/* SKU */}
                  <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                    {product.sku}
                  </p>

                  {/* Price */}
                  <p className="mt-2 text-base font-bold tabular-nums text-[var(--accent)]">
                    {formatMXN(product.price_general)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
