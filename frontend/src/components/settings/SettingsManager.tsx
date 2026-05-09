"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import { PageHeader } from "@/components/ui";
import { Tabs } from "@/components/ui/Tabs";
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
  { key: "business", label: "Negocio" },
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
      <Tabs
        variant="segmented"
        tabs={TABS}
        active={activeTab}
        onChange={setActiveTab}
      />

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
