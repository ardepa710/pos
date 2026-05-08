"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { settingsApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { LoadingSpinner, FormField } from "@/components/ui";
import { cn } from "@/lib/utils";

const BUSINESS_TYPES: { value: string; label: string }[] = [
  { value: "general", label: "General" },
  { value: "clothing", label: "Ropa" },
  { value: "jewelry", label: "Joyería" },
  { value: "electronics", label: "Electrónica" },
  { value: "food", label: "Alimentos" },
  { value: "beauty", label: "Belleza" },
  { value: "pharmacy", label: "Farmacia" },
  { value: "hardware", label: "Ferretería" },
  { value: "books", label: "Libros" },
  { value: "sports", label: "Deportes" },
  { value: "toys", label: "Juguetes" },
  { value: "other", label: "Otro" },
];

const schema = z.object({
  business_name: z.string().min(1, t.error.required),
  business_type: z.string().min(1, t.error.required),
  primary_color: z.string().min(4),
  theme: z.enum(["light", "dark", "system"]),
  support_whatsapp: z.string().optional(),
  logo_url: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function BusinessSettingsForm() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["settings", "business"],
    queryFn: () => settingsApi.getBusiness(token),
    enabled: !!token,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      business_name: "",
      business_type: "general",
      primary_color: "#6B7A3F",
      theme: "system",
      support_whatsapp: "",
      logo_url: "",
    },
  });

  // Populate form once data arrives
  useEffect(() => {
    if (data) {
      reset({
        business_name: data.business_name ?? "",
        business_type: data.business_type ?? "general",
        primary_color: data.primary_color ?? "#6B7A3F",
        theme: data.theme ?? "system",
        support_whatsapp: data.support_whatsapp ?? "",
        logo_url: data.logo_url ?? "",
      });
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      settingsApi.updateBusiness(token, values),
    onSuccess: (updated) => {
      queryClient.setQueryData(["settings", "business"], updated);
      // Keep layout query in sync so theme/color effects in AppLayout re-fire
      queryClient.setQueryData(["business-settings"], updated);
      // Apply primary color immediately without waiting for layout re-render
      if (updated.primary_color) {
        const root = document.documentElement;
        root.style.setProperty("--accent", updated.primary_color);
        root.style.setProperty("--border-focus", updated.primary_color);
        root.style.setProperty("--info", updated.primary_color);
        root.style.setProperty("--accent-subtle", updated.primary_color + "1a");
      }
      reset({
        business_name: updated.business_name ?? "",
        business_type: updated.business_type ?? "general",
        primary_color: updated.primary_color ?? "#6B7A3F",
        theme: updated.theme ?? "system",
        support_whatsapp: updated.support_whatsapp ?? "",
        logo_url: updated.logo_url ?? "",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <LoadingSpinner />
      </div>
    );
  }

  const THEME_OPTIONS: { value: FormValues["theme"]; label: string }[] = [
    { value: "light", label: t.settings.theme_light },
    { value: "dark", label: t.settings.theme_dark },
    { value: "system", label: t.settings.theme_system },
  ];

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="flex flex-col gap-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
    >
      <h2 className="text-base font-semibold text-[var(--text-primary)]">
        Información del negocio
      </h2>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Business name */}
        <FormField
          label={t.settings.business_name}
          error={errors.business_name?.message}
          required
        >
          <input
            {...register("business_name")}
            type="text"
            placeholder="Mi Tienda"
            className={cn(
              "w-full rounded-lg border bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors",
              "focus:ring-2 focus:ring-[var(--border-focus)]",
              errors.business_name
                ? "border-[var(--error)]"
                : "border-[var(--border)]",
            )}
          />
        </FormField>

        {/* Business type */}
        <FormField
          label={t.settings.business_type}
          error={errors.business_type?.message}
          required
        >
          <select
            {...register("business_type")}
            className={cn(
              "w-full rounded-lg border bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors",
              "focus:ring-2 focus:ring-[var(--border-focus)]",
              errors.business_type
                ? "border-[var(--error)]"
                : "border-[var(--border)]",
            )}
          >
            {BUSINESS_TYPES.map((bt) => (
              <option key={bt.value} value={bt.value}>
                {bt.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Primary color */}
        <FormField label={t.settings.primary_color}>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={watch("primary_color") ?? "#6B7A3F"}
              onChange={(e) =>
                setValue("primary_color", e.target.value, { shouldDirty: true })
              }
              className="h-10 w-14 cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--bg-input)] p-1"
            />
            <input
              {...register("primary_color")}
              type="text"
              placeholder="#6B7A3F"
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--border-focus)]"
            />
          </div>
        </FormField>

        {/* WhatsApp */}
        <FormField label="WhatsApp de soporte">
          <input
            {...register("support_whatsapp")}
            type="tel"
            placeholder="+52 555 000 0000"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--border-focus)]"
          />
        </FormField>

        {/* Logo URL */}
        <FormField label={t.settings.logo} className="sm:col-span-2">
          <input
            {...register("logo_url")}
            type="text"
            placeholder="https://ejemplo.com/logo.png"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--border-focus)]"
          />
        </FormField>
      </div>

      {/* Theme radio */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          {t.settings.theme}
        </span>
        <div className="flex gap-3">
          {THEME_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--text-primary)]"
            >
              <input
                {...register("theme")}
                type="radio"
                value={opt.value}
                className="accent-[var(--accent)]"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {mutation.isError && (
        <p className="rounded-lg bg-[var(--error-subtle)] px-4 py-3 text-sm text-[var(--error)]">
          {t.error.generic}
        </p>
      )}

      {mutation.isSuccess && (
        <p className="rounded-lg bg-[var(--success-subtle)] px-4 py-3 text-sm text-[var(--success)]">
          Configuración guardada correctamente.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!isDirty || mutation.isPending}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition",
            "bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] active:scale-[0.96]",
            "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
          )}
        >
          <Save size={16} />
          {mutation.isPending ? t.action.loading : t.action.save}
        </button>
      </div>
    </form>
  );
}
