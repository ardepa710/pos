"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Monitor, Moon, Sun } from "lucide-react";
import { settingsApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

const THEMES: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: "light", label: t.settings.theme_light, icon: <Sun size={18} /> },
  { value: "dark", label: t.settings.theme_dark, icon: <Moon size={18} /> },
  {
    value: "system",
    label: t.settings.theme_system,
    icon: <Monitor size={18} />,
  },
];

export function AppearanceSettings() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["business-settings"],
    queryFn: () => settingsApi.getBusiness(token),
  });

  // Derive theme directly from query — no local state to get out of sync
  const theme: Theme = settings?.theme ?? "system";

  const updateMutation = useMutation({
    mutationFn: (newTheme: Theme) =>
      settingsApi.updateBusiness(token, { theme: newTheme }),
    onMutate: (newTheme) => {
      // Optimistic update so button responds immediately
      queryClient.setQueryData(
        ["business-settings"],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (old: any) => (old ? { ...old, theme: newTheme } : old),
      );
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["business-settings"], updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["business-settings"] });
    },
  });

  function handleThemeChange(val: Theme) {
    updateMutation.mutate(val);
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 flex flex-col gap-4">
        <h3 className="font-semibold text-[var(--text-primary)]">
          {t.settings.theme}
        </h3>

        <div className="grid grid-cols-3 gap-3">
          {THEMES.map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleThemeChange(value)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition active:scale-[0.96]",
                theme === value
                  ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-elevated)]",
              )}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 flex flex-col gap-3">
        <h3 className="font-semibold text-[var(--text-primary)]">Idioma</h3>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🇲🇽</span>
          <div>
            <p className="font-medium text-[var(--text-primary)]">
              Español (México)
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              es-MX · Solo idioma disponible
            </p>
          </div>
        </div>
      </section>

      {saved && (
        <div className="rounded-lg bg-[var(--success-subtle)] px-4 py-2 text-sm text-[var(--success)]">
          ✓ Preferencias guardadas
        </div>
      )}
    </div>
  );
}
