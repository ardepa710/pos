"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore, selectIsAuthenticated } from "@/store/auth";
import { settingsApi } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const token = useAuthStore((s) => s.token) ?? "";
  const router = useRouter();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["business-settings"],
    queryFn: () => settingsApi.getBusiness(token),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (settings && !settings.wizard_completed) router.replace("/setup");
  }, [settings, router]);

  // Apply theme to <html>
  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    const theme = settings.theme ?? "system";
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      root.classList.toggle(
        "dark",
        window.matchMedia("(prefers-color-scheme: dark)").matches,
      );
    }
  }, [settings?.theme]);

  // Apply primary color CSS variables to <html>
  useEffect(() => {
    const color = settings?.primary_color;
    if (!color) return;
    const root = document.documentElement;
    root.style.setProperty("--accent", color);
    root.style.setProperty("--border-focus", color);
    root.style.setProperty("--info", color);
    root.style.setProperty("--accent-subtle", color + "1a");
  }, [settings?.primary_color]);

  if (!isAuthenticated) return null;
  if (isLoading) return null;
  if (settings && !settings.wizard_completed) return null;

  return (
    <AppShell
      businessName={settings?.business_name}
      logoUrl={settings?.logo_url}
    >
      {children}
    </AppShell>
  );
}
