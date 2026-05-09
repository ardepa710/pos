"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { authApi, fetchBranding } from "@/lib/api";
import { useAuthStore, selectIsAuthenticated } from "@/store/auth";
import { Button, Input } from "@/components/ui";
import type { BrandingConfig } from "@/types/index";

// ── Validation schema ─────────────────────────────────────────────────────

const loginSchema = z.object({
  username: z.string().min(1, "El usuario es obligatorio"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ── Component ─────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/pos");
    }
  }, [isAuthenticated, router]);

  // Reset CSS accent vars to Kolekto defaults when entering the auth area.
  // (app)/layout.tsx injects the business primary_color into --accent on <html> at runtime.
  // Client-side navigation from the app back to /login does NOT reset inline styles,
  // so the login button would inherit the business color. We explicitly clear it here.
  useEffect(() => {
    const root = document.documentElement;
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-hover");
    root.style.removeProperty("--border-focus");
    root.style.removeProperty("--info");
    root.style.removeProperty("--accent-subtle");
  }, []);

  // Load branding (unauthenticated endpoint)
  useEffect(() => {
    fetchBranding().then((b) => {
      if (b) setBranding(b);
    });
  }, []);

  const onSubmit = async (values: LoginFormValues) => {
    setLoginError(null);
    setIsSubmitting(true);
    try {
      const result = await authApi.login(values.username, values.password);
      setAuth(result.access_token, result.user);

      if (result.user.must_change_password) {
        router.replace("/change-password");
      } else {
        router.replace("/pos");
      }
    } catch {
      setLoginError("Usuario o contraseña incorrectos");
    } finally {
      setIsSubmitting(false);
    }
  };

  const businessName = branding?.business_name ?? "Kolekto";

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-base)]">
      <div className="w-full max-w-md rounded-xl p-8 bg-[var(--bg-card)] border border-[var(--border)] shadow-[var(--shadow-modal)]">
        {/* Logo / business name */}
        <div className="flex flex-col items-center mb-8 gap-3">
          {branding?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logo_url}
              alt={businessName}
              className="h-14 w-auto object-contain ring-1 ring-black/10"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/logo-horizontal.png"
              alt="Kolekto"
              style={{ height: "2.25rem", width: "auto", objectFit: "contain" }}
            />
          )}
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            {businessName}
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Inicia sesión para continuar
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-5"
        >
          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="username"
              className="text-sm font-medium text-[var(--text-primary)]"
            >
              Usuario
            </label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={isSubmitting}
              hasError={!!errors.username}
              {...register("username")}
              placeholder="nombre.usuario"
            />
            {errors.username && (
              <p className="text-xs text-[var(--error)]">
                {errors.username.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-[var(--text-primary)]"
            >
              Contraseña
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                disabled={isSubmitting}
                hasError={!!errors.password}
                {...register("password")}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 text-[var(--text-muted)]"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-[var(--error)]">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Server error */}
          {loginError && (
            <div
              className="rounded-lg px-4 py-3 text-sm flex items-center gap-2 bg-[var(--error-subtle)] border border-[var(--error)] text-[var(--error)]"
              role="alert"
            >
              <span>{loginError}</span>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="w-full mt-1"
          >
            Iniciar sesión
          </Button>
        </form>
      </div>
    </main>
  );
}
