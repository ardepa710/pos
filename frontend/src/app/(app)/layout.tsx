"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, selectIsAuthenticated } from "@/store/auth";
import { AppShell } from "@/components/layout/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return <AppShell>{children}</AppShell>;
}
