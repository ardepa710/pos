"use client";

import { useState } from "react";
import { Package, Tag } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { ProductList } from "./ProductList";
import { CategoryList } from "./CategoryList";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Tab = "products" | "categories";

export function CatalogManager() {
  const [activeTab, setActiveTab] = useState<Tab>("products");

  return (
    <div className="p-6">
      <PageHeader
        title={t.nav.catalog}
        subtitle="Gestión de productos y categorías"
      />

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("products")}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition active:scale-[0.96]",
            activeTab === "products"
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-elevated)]",
          )}
        >
          <Package size={15} aria-hidden />
          {t.products.title}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("categories")}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition active:scale-[0.96]",
            activeTab === "categories"
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-elevated)]",
          )}
        >
          <Tag size={15} aria-hidden />
          Categorías
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "products" ? <ProductList /> : <CategoryList />}
    </div>
  );
}
