"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { X, DollarSign } from "lucide-react";
import { t } from "@/lib/i18n";
import { purchasesApi } from "@/lib/api";
import type { PurchaseRead, SupplierRead } from "@/types/index";
import { useAuth } from "@/hooks/useAuth";
import { FormField, CurrencyDisplay, StatusBadge } from "@/components/ui";

interface ConsignmentSettleFormProps {
  consignment: PurchaseRead;
  suppliers: SupplierRead[];
  onClose: () => void;
  onSuccess: () => void;
}

interface SettleValues {
  quantity_sold: string;
  gross_sales_mxn: string;
  notes: string;
}

export function ConsignmentSettleForm({
  consignment,
  suppliers,
  onClose,
  onSuccess,
}: ConsignmentSettleFormProps) {
  const { token } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const supplier = suppliers.find((s) => s.id === consignment.supplier_id);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SettleValues>({
    defaultValues: {
      quantity_sold: "",
      gross_sales_mxn: "",
      notes: "",
    },
  });

  const watchedSales = watch("gross_sales_mxn");
  const consignedValue = parseFloat(String(consignment.total ?? "0"));
  const grossSales = parseFloat(watchedSales || "0");
  const commission =
    grossSales > consignedValue ? grossSales - consignedValue : 0;

  async function onSubmit(data: SettleValues) {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // POST to the consignment settle endpoint
      await (
        purchasesApi as unknown as {
          settle: (
            token: string,
            id: string,
            payload: object,
          ) => Promise<unknown>;
        }
      ).settle(token, consignment.id, {
        quantity_sold: data.quantity_sold,
        gross_sales_mxn: data.gross_sales_mxn,
        notes: data.notes || undefined,
      });
      onSuccess();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t.error.generic);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative flex flex-col w-full max-w-lg max-h-[90vh] rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="text-[var(--accent)]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {t.purchases.settle} consignación
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-card-elevated)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col min-h-0 flex-1"
        >
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
            {/* Consignment summary */}
            <div className="rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
              <div className="grid grid-cols-2 divide-x divide-[var(--border)]">
                <div className="px-4 py-3">
                  <p className="text-xs text-[var(--text-muted)] mb-0.5">
                    {t.purchases.folio}
                  </p>
                  <p className="font-mono text-sm text-[var(--text-primary)]">
                    {consignment.folio}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs text-[var(--text-muted)] mb-0.5">
                    Estado
                  </p>
                  <StatusBadge status={consignment.status} size="sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-[var(--border)]">
                <div className="px-4 py-3">
                  <p className="text-xs text-[var(--text-muted)] mb-0.5">
                    {t.purchases.supplier}
                  </p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {supplier?.legal_name ?? consignment.supplier_id}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs text-[var(--text-muted)] mb-0.5">
                    Valor consignado
                  </p>
                  <CurrencyDisplay amount={consignment.total} size="sm" />
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-[var(--text-muted)] mb-0.5">
                  Artículos
                </p>
                <p className="text-sm text-[var(--text-primary)]">
                  {consignment.items?.length ?? 0} producto(s)
                </p>
              </div>
            </div>

            {/* Settlement fields */}
            <FormField
              label="Unidades vendidas"
              required
              error={errors.quantity_sold?.message}
            >
              <input
                {...register("quantity_sold", {
                  required: t.error.required,
                  min: { value: 0, message: "Debe ser mayor o igual a 0" },
                })}
                type="number"
                step="1"
                min="0"
                placeholder="0"
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] placeholder:text-[var(--text-muted)]"
              />
            </FormField>

            <FormField
              label="Ventas brutas (MXN)"
              required
              error={errors.gross_sales_mxn?.message}
            >
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">
                  $
                </span>
                <input
                  {...register("gross_sales_mxn", {
                    required: t.error.required,
                    min: { value: 0, message: "Debe ser mayor o igual a 0" },
                  })}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] pl-7 pr-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] placeholder:text-[var(--text-muted)]"
                />
              </div>
            </FormField>

            <FormField label="Notas">
              <textarea
                {...register("notes")}
                rows={3}
                placeholder="Observaciones sobre la liquidación…"
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] placeholder:text-[var(--text-muted)] resize-none"
              />
            </FormField>

            {/* Commission preview */}
            {grossSales > 0 && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card-elevated)] divide-y divide-[var(--border)]">
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-[var(--text-secondary)]">
                    Ventas brutas
                  </span>
                  <CurrencyDisplay amount={watchedSales || "0"} size="sm" />
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-[var(--text-secondary)]">
                    Valor consignado
                  </span>
                  <CurrencyDisplay amount={consignment.total} size="sm" />
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-sm font-medium">
                  <span className="text-[var(--text-primary)]">
                    Comisión estimada
                  </span>
                  <CurrencyDisplay
                    amount={commission.toFixed(2)}
                    size="sm"
                    showSign
                  />
                </div>
              </div>
            )}

            {submitError && (
              <p className="rounded-lg border border-[var(--error)] bg-[var(--error-subtle)] px-4 py-3 text-sm text-[var(--error)]">
                {submitError}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-elevated)] transition-colors disabled:opacity-50"
            >
              {t.action.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition active:scale-[0.96] disabled:opacity-50 disabled:active:scale-100"
            >
              <DollarSign size={15} />
              {isSubmitting ? t.action.loading : t.purchases.settle}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
