"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { PageHeader } from "@/components/ui";
import { BusinessSettingsForm } from "./BusinessSettingsForm";
import { UsersManager } from "./UsersManager";
import { AppearanceSettings } from "./AppearanceSettings";
import { TicketSettings } from "./TicketSettings";

type TabKey = "business" | "users" | "appearance" | "ticket";

interface Tab {
  key: TabKey;
  label: string;
}

const TABS: Tab[] = [
  {
    key: "business",
    label:
      t.settings.business_name.replace(" del negocio", "") + " del negocio",
  },
  { key: "users", label: t.nav.users },
  { key: "appearance", label: "Apariencia" },
  { key: "ticket" as const, label: "Ticket" },
];

export function SettingsManager() {
  const [activeTab, setActiveTab] = useState<TabKey>("business");

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title={t.nav.settings} />

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-[var(--bg-card)] p-1 border border-[var(--border)]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition active:scale-[0.96]",
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
        {activeTab === "business" && <BusinessSettingsForm />}
        {activeTab === "users" && <UsersManager />}
        {activeTab === "appearance" && <AppearanceSettings />}
        {activeTab === "ticket" && <TicketSettings />}
      </div>
    </div>
  );
}
