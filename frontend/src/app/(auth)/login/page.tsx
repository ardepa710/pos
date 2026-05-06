"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShoppingCart } from "lucide-react";
import { authApi, fetchBranding } from "@/lib/api";
import { useAuthStore, selectIsAuthenticated } from "@/store/auth";
import { t } from "@/lib/i18n";
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

  const businessName = branding?.business_name ?? "Punto de Venta";

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      <div
        className="w-full max-w-md rounded-xl p-8"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-modal)",
        }}
      >
        {/* Logo / business name */}
        <div className="flex flex-col items-center mb-8 gap-3">
          {branding?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logo_url}
              alt={businessName}
              className="h-14 w-auto object-contain"
            />
          ) : (
            <div
              className="flex items-center justify-center w-14 h-14 rounded-xl"
              style={{ backgroundColor: "var(--accent-subtle)" }}
            >
              <ShoppingCart
                size={28}
                style={{ color: "var(--accent)" }}
                aria-hidden="true"
              />
            </div>
          )}
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {businessName}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
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
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Usuario
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={isSubmitting}
              {...register("username")}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors disabled:opacity-50"
              style={{
                backgroundColor: "var(--bg-input)",
                border: `1px solid ${errors.username ? "var(--error)" : "var(--border)"}`,
                color: "var(--text-primary)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = errors.username
                  ? "var(--error)"
                  : "var(--border-focus)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = errors.username
                  ? "var(--error)"
                  : "var(--border)";
              }}
              placeholder="nombre.usuario"
            />
            {errors.username && (
              <p className="text-xs" style={{ color: "var(--error)" }}>
                {errors.username.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                disabled={isSubmitting}
                {...register("password")}
                className="w-full rounded-lg px-3 py-2.5 pr-10 text-sm outline-none transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: "var(--bg-input)",
                  border: `1px solid ${errors.password ? "var(--error)" : "var(--border)"}`,
                  color: "var(--text-primary)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = errors.password
                    ? "var(--error)"
                    : "var(--border-focus)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.password
                    ? "var(--error)"
                    : "var(--border)";
                }}
                placeholder="••••••••"
              />
              <button
                type="button"
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center"
                style={{ color: "var(--text-muted)" }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs" style={{ color: "var(--error)" }}>
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Server error */}
          {loginError && (
            <div
              className="rounded-lg px-4 py-3 text-sm flex items-center gap-2"
              role="alert"
              style={{
                backgroundColor: "var(--error-subtle)",
                border: "1px solid var(--error)",
                color: "var(--error)",
              }}
            >
              <span>{loginError}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-1"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--accent-foreground)",
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting)
                e.currentTarget.style.backgroundColor = "var(--accent-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--accent)";
            }}
          >
            {isSubmitting ? t.action.loading : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </main>
  );
}
