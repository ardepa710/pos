"use client";

import { cn } from "@/lib/utils";

export interface TabItem<T extends string = string> {
  key: T;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  active: T;
  onChange: (key: T) => void;
  /**
   * "pill" — compact, w-fit container; accent fill on active tab.
   *           Use for context switches within a page (e.g. CatalogManager).
   * "segmented" — full-width; flex-1 buttons fill the container.
   *               Use for top-level page sections (e.g. SettingsManager).
   */
  variant?: "pill" | "segmented";
  className?: string;
}

/**
 * Primitive <Tabs> — replaces hand-rolled tab bars.
 * Generic over T so TypeScript enforces that `active` is one of the tab keys.
 *
 * Usage (pill):
 *   <Tabs variant="pill" tabs={[{key:"a",label:"A"},{key:"b",label:"B"}]} active={tab} onChange={setTab} />
 *
 * Usage (segmented):
 *   <Tabs variant="segmented" tabs={TABS} active={activeTab} onChange={setActiveTab} />
 */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  variant = "pill",
  className,
}: TabsProps<T>) {
  const isPill = variant === "pill";

  return (
    <div
      role="tablist"
      className={cn(
        "flex gap-1 border border-[var(--border)] bg-[var(--bg-card)] p-1",
        isPill ? "w-fit rounded-lg" : "rounded-xl",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={cn(
              "inline-flex items-center gap-2 text-sm font-medium transition-colors active:scale-[0.96]",
              // Pill: natural width; Segmented: flex-1
              isPill
                ? "rounded-md px-4 py-2"
                : "flex-1 justify-center rounded-lg px-3 py-2",
              isActive
                ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-elevated)] hover:text-[var(--text-primary)]",
            )}
          >
            {tab.icon && <span aria-hidden>{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
