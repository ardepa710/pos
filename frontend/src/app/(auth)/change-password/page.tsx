"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuthStore, selectIsAuthenticated } from "@/store/auth";
import { t } from "@/lib/i18n";

// ── Validation schema ─────────────────────────────────────────────────────

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "La contraseña actual es obligatoria"),
    new_password: z
      .string()
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
    confirm_password: z.string().min(1, "Confirma tu nueva contraseña"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Las contraseñas no coinciden",
    path: ["confirm_password"],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

// ── Password input with show/hide toggle ─────────────────────────────────

interface PasswordInputProps {
  id: string;
  label: string;
  autoComplete?: string;
  placeholder?: string;
  disabled?: boolean;
  hasError: boolean;
  errorMessage?: string;
  registration: ReturnType<
    ReturnType<typeof useForm<ChangePasswordFormValues>>["register"]
  >;
}

function PasswordInput({
  id,
  label,
  autoComplete,
  placeholder,
  disabled,
  hasError,
  errorMessage,
  registration,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-sm font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          disabled={disabled}
          placeholder={placeholder ?? "••••••••"}
          {...registration}
          className="w-full rounded-lg px-3 py-2.5 pr-10 text-sm outline-none transition-colors disabled:opacity-50"
          style={{
            backgroundColor: "var(--bg-input)",
            border: `1px solid ${hasError ? "var(--error)" : "var(--border)"}`,
            color: "var(--text-primary)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = hasError
              ? "var(--error)"
              : "var(--border-focus)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = hasError
              ? "var(--error)"
              : "var(--border)";
          }}
        />
        <button
          type="button"
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center"
          style={{ color: "var(--text-muted)" }}
          tabIndex={-1}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hasError && errorMessage && (
        <p className="text-xs" style={{ color: "var(--error)" }}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function ChangePasswordPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  // Wait one render cycle for Zustand persist to hydrate from localStorage
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Redirect to login if not authenticated (only after hydration)
  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hasHydrated, isAuthenticated, router]);

  const onSubmit = async (values: ChangePasswordFormValues) => {
    if (!token) return;
    setServerError(null);
    setIsSubmitting(true);
    try {
      await authApi.changePassword(
        token,
        values.current_password,
        values.new_password,
      );
      router.replace("/pos");
    } catch (err) {
      const message = err instanceof Error ? err.message : t.error.generic;
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render nothing until hydrated or if redirecting to login
  if (!hasHydrated || !isAuthenticated) return null;

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
        {/* Header */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div
            className="flex items-center justify-center w-14 h-14 rounded-xl"
            style={{ backgroundColor: "var(--accent-subtle)" }}
          >
            <Lock
              size={28}
              style={{ color: "var(--accent)" }}
              aria-hidden="true"
            />
          </div>
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Cambiar contraseña
          </h1>
          {user && (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Hola,{" "}
              <span className="font-medium">
                {user.full_name || user.username}
              </span>
              . Debes establecer una nueva contraseña para continuar.
            </p>
          )}
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-5"
        >
          <PasswordInput
            id="current_password"
            label="Contraseña actual"
            autoComplete="current-password"
            disabled={isSubmitting}
            hasError={!!errors.current_password}
            errorMessage={errors.current_password?.message}
            registration={register("current_password")}
          />

          <PasswordInput
            id="new_password"
            label="Nueva contraseña"
            autoComplete="new-password"
            disabled={isSubmitting}
            hasError={!!errors.new_password}
            errorMessage={errors.new_password?.message}
            registration={register("new_password")}
          />

          <PasswordInput
            id="confirm_password"
            label="Confirmar nueva contraseña"
            autoComplete="new-password"
            disabled={isSubmitting}
            hasError={!!errors.confirm_password}
            errorMessage={errors.confirm_password?.message}
            registration={register("confirm_password")}
          />

          {/* Password strength hint */}
          <p className="text-xs -mt-2" style={{ color: "var(--text-muted)" }}>
            Mínimo 8 caracteres
          </p>

          {/* Server error */}
          {serverError && (
            <div
              className="rounded-lg px-4 py-3 text-sm flex items-center gap-2"
              role="alert"
              style={{
                backgroundColor: "var(--error-subtle)",
                border: "1px solid var(--error)",
                color: "var(--error)",
              }}
            >
              <span>{serverError}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg py-2.5 text-sm font-semibold transition active:scale-[0.96] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 mt-1"
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
            {isSubmitting ? t.action.loading : "Guardar contraseña"}
          </button>
        </form>
      </div>
    </main>
  );
}
