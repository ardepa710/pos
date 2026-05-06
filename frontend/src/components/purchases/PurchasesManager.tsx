"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import { PurchaseList } from "./PurchaseList";
import { ConsignmentList } from "./ConsignmentList";

type Tab = "purchases" | "consignments";

export function PurchasesManager() {
  const [activeTab, setActiveTab] = useState<Tab>("purchases");

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        <button
          type="button"
          onClick={() => setActiveTab("purchases")}
          className={
            activeTab === "purchases"
              ? "border-b-2 border-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent)]"
              : "border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          }
        >
          {t.nav.purchases}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("consignments")}
          className={
            activeTab === "consignments"
              ? "border-b-2 border-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent)]"
              : "border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          }
        >
          {t.purchases.consignment}
        </button>
      </div>

      {/* Content */}
      {activeTab === "purchases" ? <PurchaseList /> : <ConsignmentList />}
    </div>
  );
}
