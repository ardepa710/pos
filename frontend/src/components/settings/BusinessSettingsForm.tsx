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
  support_whatsapp: z
    .string()
    .optional()
    .refine((val) => !val || /^\+?[\d\s\-().]{7,20}$/.test(val.trim()), {
      message: "Número no válido. Ej: +52 555 000 0000",
    }),
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
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      business_name: "",
      business_type: "general",
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
      reset({
        business_name: updated.business_name ?? "",
        business_type: updated.business_type ?? "general",
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

        {/* WhatsApp */}
        <FormField
          label="WhatsApp de soporte"
          error={errors.support_whatsapp?.message}
        >
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
