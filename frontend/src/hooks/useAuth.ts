"use client";

import { useAuthStore, selectIsAuthenticated } from "@/store/auth";

export function useAuth() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  return {
    // token is asserted non-null — callers should guard with isAuthenticated first
    token: token as string,
    user,
    setAuth,
    clearAuth,
    isAuthenticated,
  };
}
