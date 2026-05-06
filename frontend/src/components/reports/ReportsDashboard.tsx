"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { PageHeader } from "@/components/ui";
import { DailyReport } from "./DailyReport";
import { SalesReport } from "./SalesReport";
import { InventoryReport } from "./InventoryReport";
import { ProductsReport } from "./ProductsReport";
import { CustomersReport } from "./CustomersReport";

type TabKey = "daily" | "sales" | "inventory" | "products" | "customers";

interface Tab {
  key: TabKey;
  label: string;
}

const TABS: Tab[] = [
  { key: "daily", label: t.reports.daily },
  { key: "sales", label: t.reports.sales_period },
  { key: "inventory", label: t.reports.inventory },
  { key: "products", label: t.reports.products },
  { key: "customers", label: t.nav.customers },
];

export function ReportsDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>("daily");

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title={t.nav.reports} />

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-[var(--bg-card)] p-1 border border-[var(--border)]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-elevated)]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "daily" && <DailyReport />}
        {activeTab === "sales" && <SalesReport />}
        {activeTab === "inventory" && <InventoryReport />}
        {activeTab === "products" && <ProductsReport />}
        {activeTab === "customers" && <CustomersReport />}
      </div>
    </div>
  );
}
