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
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (settings && !settings.wizard_completed) {
      router.replace("/setup");
    }
  }, [settings, router]);

  if (!isAuthenticated) return null;
  if (isLoading) return null;
  if (settings && !settings.wizard_completed) return null;

  return <AppShell>{children}</AppShell>;
}
