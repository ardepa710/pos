import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: "admin" | "supervisor" | "cashier";
  must_change_password: boolean;
  theme_preference: "light" | "dark" | "system";
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    {
      name: "pos-auth",
    },
  ),
);

/** Derived selector — use instead of accessing token/user directly */
export const selectIsAuthenticated = (s: AuthState): boolean =>
  !!s.token && !!s.user;
