"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { hexToRgba } from "@/lib/color";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore, selectIsAuthenticated } from "@/store/auth";
import { settingsApi } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";

// Routes each role is allowed to visit. Anything not in the list redirects to /pos.
const ROLE_ALLOWED: Record<string, string[]> = {
  admin: ["/"], // admin can access everything — wildcard handled below
  supervisor: [
    "/pos",
    "/catalog",
    "/customers",
    "/suppliers",
    "/purchases",
    "/gift-cards",
    "/returns",
    "/reports",
  ],
  cashier: ["/pos", "/customers", "/catalog", "/returns"],
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const token = useAuthStore((s) => s.token) ?? "";
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();

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

  // Route guard — redirect unauthorized roles to /pos
  useEffect(() => {
    if (!user) return;
    const role = user.role as string;
    if (role === "admin") return; // admin: unrestricted
    const allowed = ROLE_ALLOWED[role] ?? [];
    const canVisit = allowed.some((prefix) => pathname.startsWith(prefix));
    if (!canVisit) router.replace("/pos");
  }, [user, pathname, router]);

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
    root.style.setProperty("--accent-subtle", hexToRgba(color, 0.1));
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
