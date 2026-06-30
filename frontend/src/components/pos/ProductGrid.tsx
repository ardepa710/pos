"use client";

import { useState, useCallback, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { productsApi, categoriesApi } from "@/lib/api";
import type { ProductRead } from "@/lib/api";
import { formatMXN } from "@/lib/currency";
import { vendorColor } from "@/lib/vendor-color";
import {
  SearchInput,
  LoadingSpinner,
  EmptyState,
  ProductThumb,
} from "@/components/ui";

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
              "flex-shrink-0 rounded-full px-3.5 py-2 text-xs font-medium",
              "transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
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
                "flex-shrink-0 rounded-full px-3.5 py-2 text-xs font-medium",
                "transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
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
          <EmptyState
            icon={<AlertCircle size={30} />}
            title={t.error.network}
            tone="tinto"
            action={
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                {t.action.retry}
              </button>
            }
          />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package size={30} />}
            title={t.products.no_products}
            hint={t.products.no_products_hint}
            tone="mostaza"
          />
        ) : (
          <div className="grid grid-cols-2 gap-2 pb-2 lg:grid-cols-3">
            {products.map((product, idx) => {
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
                  style={{ "--i": Math.min(idx, 12) } as CSSProperties}
                  className={cn(
                    "motion-stagger hover-lift relative flex flex-col overflow-hidden rounded-lg border p-0 text-left",
                    "bg-[var(--product-card-bg)] shadow-[var(--shadow-card)]",
                    "transition duration-150",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
                    outOfStock
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer hover:border-[var(--accent)] hover:shadow-[var(--shadow-elevated)] active:scale-[0.97]",
                    isFlashing
                      ? "border-[var(--success)] bg-[var(--success-subtle)] scale-[0.97]"
                      : "border-[var(--border)]",
                  )}
                >
                  {/* Vendor identity dot — Kolekto signature, stable per category/supplier */}
                  <span
                    className="absolute right-2 top-2 h-2 w-2 rounded-full ring-2 ring-[var(--product-card-bg)]"
                    style={{
                      background: vendorColor(
                        product.category_id ??
                          product.consigned_supplier_id ??
                          product.sku,
                      ),
                    }}
                    aria-hidden
                  />

                  {/* Stock badge — only shown when out-of-stock or low stock */}
                  {product.track_inventory && (outOfStock || lowStock) && (
                    <div
                      className={cn(
                        "absolute bottom-0 left-0 right-0 rounded-b-lg px-2 py-0.5 text-center text-[10px] font-semibold text-white",
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

                  {/* Image (or initials fallback) header */}
                  <ProductThumb
                    url={product.thumbnail_url}
                    name={product.name}
                    seed={
                      product.category_id ??
                      product.consigned_supplier_id ??
                      product.sku
                    }
                    className="h-20 w-full text-xl"
                  />

                  <div className="flex flex-col p-3">
                    {/* Consignment badge */}
                    {product.is_consigned && (
                      <span className="mb-1 self-start rounded-sm bg-[var(--info-subtle)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--info)]">
                        {t.sales.consignment_badge}
                      </span>
                    )}

                    {/* Name */}
                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)]">
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
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
