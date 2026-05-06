"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { HeroUIProvider } from "@heroui/react";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/auth";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const { user } = useAuthStore();

  const themeClass =
    user?.theme_preference === "dark" ||
    (user?.theme_preference === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dark"
      : "";

  return (
    <QueryClientProvider client={queryClient}>
      <HeroUIProvider>
        <div className={themeClass || undefined}>{children}</div>
      </HeroUIProvider>
    </QueryClientProvider>
  );
}
