"use client";

import { useState } from "react";
import { Package, Tag } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { Tabs } from "@/components/ui/Tabs";
import { ProductList } from "./ProductList";
import { CategoryList } from "./CategoryList";
import { t } from "@/lib/i18n";

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
      <Tabs
        variant="pill"
        tabs={[
          {
            key: "products" as Tab,
            label: t.products.title,
            icon: <Package size={15} aria-hidden />,
          },
          {
            key: "categories" as Tab,
            label: "Categorías",
            icon: <Tag size={15} aria-hidden />,
          },
        ]}
        active={activeTab}
        onChange={setActiveTab}
        className="mb-6"
      />

      {/* Tab content */}
      {activeTab === "products" ? <ProductList /> : <CategoryList />}
    </div>
  );
}
