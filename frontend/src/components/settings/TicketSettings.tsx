"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Printer, RefreshCw, Check } from "lucide-react";
import { settingsApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { LoadingSpinner, FormField } from "@/components/ui";

// ── Toggle switch ─────────────────────────────────────────────────────────

function Toggle({
  enabled,
  onChange,
  label,
  description,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left transition hover:bg-[var(--bg-card-elevated)] active:scale-[0.98]"
    >
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {label}
        </p>
        {description && (
          <p className="text-xs text-[var(--text-muted)]">{description}</p>
        )}
      </div>
      <div
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          enabled ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
            enabled ? "translate-x-6" : "translate-x-1",
          )}
        />
      </div>
    </button>
  );
}

// ── Form values ───────────────────────────────────────────────────────────

interface TicketFormValues {
  ticket_header: string;
  ticket_footer: string;
  ticket_show_logo: boolean;
  ticket_show_iva: boolean;
  ticket_printer_name: string;
}

// ── Component ─────────────────────────────────────────────────────────────

export function TicketSettings() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [detectedPrinters, setDetectedPrinters] = useState<string[]>([]);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [detectLoading, setDetectLoading] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["business-settings"],
    queryFn: () => settingsApi.getBusiness(token),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isDirty },
  } = useForm<TicketFormValues>({
    defaultValues: {
      ticket_header: "",
      ticket_footer: "",
      ticket_show_logo: true,
      ticket_show_iva: false,
      ticket_printer_name: "",
    },
  });

  // Populate when data loads
  const [populated, setPopulated] = useState(false);
  if (settings && !populated) {
    reset({
      ticket_header: settings.ticket_header ?? "",
      ticket_footer: settings.ticket_footer ?? "",
      ticket_show_logo: settings.ticket_show_logo ?? true,
      ticket_show_iva: settings.ticket_show_iva ?? false,
      ticket_printer_name: settings.ticket_printer_name ?? "",
    });
    setPopulated(true);
  }

  const showLogo = watch("ticket_show_logo");
  const showIva = watch("ticket_show_iva");
  const printerName = watch("ticket_printer_name");

  const mutation = useMutation({
    mutationFn: (values: TicketFormValues) =>
      settingsApi.updateBusiness(token, {
        ticket_header: values.ticket_header || undefined,
        ticket_footer: values.ticket_footer || undefined,
        ticket_show_logo: values.ticket_show_logo,
        ticket_show_iva: values.ticket_show_iva,
        ticket_printer_name: values.ticket_printer_name || undefined,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["business-settings"], updated);
      queryClient.setQueryData(["settings", "business"], updated);
      reset({
        ticket_header: updated.ticket_header ?? "",
        ticket_footer: updated.ticket_footer ?? "",
        ticket_show_logo: updated.ticket_show_logo ?? true,
        ticket_show_iva: updated.ticket_show_iva ?? false,
        ticket_printer_name: updated.ticket_printer_name ?? "",
      });
      setPopulated(true);
    },
  });

  async function handleDetectPrinters() {
    setDetectLoading(true);
    setDetectError(null);
    try {
      const result = await settingsApi.getPrinters(token);
      if (result.available && result.printers.length > 0) {
        setDetectedPrinters(result.printers);
      } else {
        setDetectError(result.message ?? "No se encontraron impresoras");
      }
    } catch {
      setDetectError("No se pudo conectar al Print Bridge");
    } finally {
      setDetectLoading(false);
    }
  }

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
      className="flex flex-col gap-5 max-w-2xl"
    >
      {/* Header text */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 flex flex-col gap-4">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">
            Encabezado del ticket
          </h3>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Texto que aparece en la parte superior del ticket, antes de los
            artículos.
          </p>
        </div>
        <textarea
          {...register("ticket_header")}
          rows={4}
          placeholder={
            "Mi Negocio\nCalle Ejemplo 123, Ciudad\nTel: (55) 1234-5678\nRFC: XAXX010101000"
          }
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none font-mono resize-y focus:border-[var(--border-focus)] placeholder:text-[var(--text-muted)]"
        />
      </section>

      {/* Toggle options */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 flex flex-col gap-1">
        <h3 className="font-semibold text-[var(--text-primary)] mb-2">
          Opciones del ticket
        </h3>

        <Toggle
          enabled={showLogo}
          onChange={(v) =>
            setValue("ticket_show_logo", v, { shouldDirty: true })
          }
          label="Incluir logo"
          description="Imprime el logo del negocio en el encabezado del ticket"
        />

        <div className="h-px bg-[var(--border)] mx-4" />

        <Toggle
          enabled={showIva}
          onChange={(v) =>
            setValue("ticket_show_iva", v, { shouldDirty: true })
          }
          label="Desglosar IVA"
          description={
            showIva
              ? "El ticket mostrará: subtotal + IVA (16%) + total"
              : "El ticket mostrará solo el total final"
          }
        />
      </section>

      {/* Footer text */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 flex flex-col gap-4">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">
            Pie de página del ticket
          </h3>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Texto que aparece al final del ticket, después del total.
          </p>
        </div>
        <textarea
          {...register("ticket_footer")}
          rows={3}
          placeholder="¡Gracias por su compra!\nVisítenos de nuevo pronto."
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none resize-y focus:border-[var(--border-focus)] placeholder:text-[var(--text-muted)]"
        />
      </section>

      {/* Printer selection */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 flex flex-col gap-4">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">
            Impresora
          </h3>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Nombre exacto de la impresora de tickets en Windows.
          </p>
        </div>

        <div className="flex gap-2">
          {detectedPrinters.length > 0 ? (
            <select
              value={printerName}
              onChange={(e) =>
                setValue("ticket_printer_name", e.target.value, {
                  shouldDirty: true,
                })
              }
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
            >
              <option value="">— Seleccionar impresora —</option>
              {detectedPrinters.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          ) : (
            <input
              {...register("ticket_printer_name")}
              type="text"
              placeholder="ej. POS-80 Thermal Printer"
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] placeholder:text-[var(--text-muted)]"
            />
          )}

          <button
            type="button"
            onClick={handleDetectPrinters}
            disabled={detectLoading}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium",
              "text-[var(--text-secondary)] transition hover:bg-[var(--bg-card-elevated)] active:scale-[0.96]",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
            )}
            title="Detectar impresoras usando Print Bridge"
          >
            {detectLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <RefreshCw size={15} />
            )}
            Detectar
          </button>
        </div>

        {detectError && (
          <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card-elevated)] px-3 py-2.5">
            <Printer
              size={15}
              className="mt-0.5 shrink-0 text-[var(--text-muted)]"
            />
            <div>
              <p className="text-xs text-[var(--text-secondary)]">
                {detectError}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Para detección automática, instala y ejecuta el Print Bridge en
                este equipo.
              </p>
            </div>
          </div>
        )}

        {printerName && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Check size={13} className="text-[var(--success)]" />
            Impresora configurada:{" "}
            <span className="font-mono text-[var(--text-primary)]">
              {printerName}
            </span>
          </div>
        )}
      </section>

      {/* Error / Success */}
      {mutation.isError && (
        <p className="rounded-lg bg-[var(--error-subtle)] px-4 py-3 text-sm text-[var(--error)]">
          {t.error.generic}
        </p>
      )}
      {mutation.isSuccess && (
        <p className="rounded-lg bg-[var(--success-subtle)] px-4 py-3 text-sm text-[var(--success)]">
          Configuración de ticket guardada correctamente.
        </p>
      )}

      {/* Save button */}
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
          {mutation.isPending ? t.action.loading : t.action.save}
        </button>
      </div>
    </form>
  );
}
