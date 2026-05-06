"use client";

import { useState, useRef, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2, X, ChevronRight, ChevronLeft } from "lucide-react";
import { t } from "@/lib/i18n";
import { purchasesApi, productsApi } from "@/lib/api";
import type { SupplierRead } from "@/types/index";
import type { ProductRead } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { FormField } from "@/components/ui";

interface PurchaseFormProps {
  suppliers: SupplierRead[];
  onClose: () => void;
  onSuccess: () => void;
}

interface ItemRow {
  product_id: string;
  product_name: string;
  quantity: string;
  unit_cost_mxn: string;
}

interface FormValues {
  supplier_id: string;
  reference_number: string;
  notes: string;
  items: ItemRow[];
}

const STEPS = ["Proveedor", "Artículos", "Confirmar"] as const;

export function PurchaseForm({
  suppliers,
  onClose,
  onSuccess,
}: PurchaseFormProps) {
  const { token } = useAuth();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Product search state
  const [productQuery, setProductQuery] = useState("");
  const [productSuggestions, setProductSuggestions] = useState<ProductRead[]>(
    [],
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      supplier_id: "",
      reference_number: "",
      notes: "",
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");

  const totalCost = watchedItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity || "0");
    const cost = parseFloat(item.unit_cost_mxn || "0");
    return sum + qty * cost;
  }, 0);

  // Product autocomplete
  useEffect(() => {
    if (!productQuery.trim()) {
      setProductSuggestions([]);
      return;
    }
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await productsApi.list(token, {
          search: productQuery,
          limit: 8,
        });
        setProductSuggestions(res.items);
      } catch {
        setProductSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [productQuery, token]);

  function addProduct(product: ProductRead) {
    append({
      product_id: product.id,
      product_name: product.name,
      quantity: "1",
      unit_cost_mxn: product.last_cost ?? "0.00",
    });
    setProductQuery("");
    setProductSuggestions([]);
  }

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await purchasesApi.create(token, {
        supplier_id: data.supplier_id,
        purchase_type: "normal",
        reference_number: data.reference_number || undefined,
        notes: data.notes || undefined,
        items: data.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_cost_mxn: item.unit_cost_mxn,
        })),
      });
      onSuccess();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t.error.generic);
    } finally {
      setIsSubmitting(false);
    }
  }

  function canAdvance(): boolean {
    if (step === 0) return !!watch("supplier_id");
    if (step === 1) {
      const items = watch("items");
      return (
        items.length > 0 &&
        items.every(
          (i) =>
            i.product_id &&
            parseFloat(i.quantity || "0") > 0 &&
            parseFloat(i.unit_cost_mxn || "0") >= 0,
        )
      );
    }
    return true;
  }

  const watchedSupplier = watch("supplier_id");
  const selectedSupplier = suppliers.find((s) => s.id === watchedSupplier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[90vh] rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {t.purchases.new_purchase}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-card-elevated)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-6 py-3 shrink-0">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  i === step
                    ? "bg-[var(--accent)] text-white"
                    : i < step
                      ? "bg-[var(--success)] text-white"
                      : "bg-[var(--bg-card-elevated)] text-[var(--text-muted)]"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-sm ${i === step ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-muted)]"}`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <ChevronRight size={14} className="text-[var(--text-muted)]" />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col min-h-0 flex-1"
        >
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* Step 0 — Supplier */}
            {step === 0 && (
              <div className="flex flex-col gap-4">
                <FormField
                  label={t.purchases.supplier}
                  required
                  error={errors.supplier_id?.message}
                >
                  <select
                    {...register("supplier_id", { required: t.error.required })}
                    className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
                  >
                    <option value="">Seleccionar proveedor…</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label={t.purchases.reference}>
                  <input
                    {...register("reference_number")}
                    type="text"
                    placeholder="Ej: FAC-00123"
                    className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] placeholder:text-[var(--text-muted)]"
                  />
                </FormField>

                <FormField label="Notas">
                  <textarea
                    {...register("notes")}
                    rows={3}
                    placeholder="Observaciones opcionales…"
                    className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] placeholder:text-[var(--text-muted)] resize-none"
                  />
                </FormField>
              </div>
            )}

            {/* Step 1 — Items */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                {/* Product search */}
                <div className="relative">
                  <FormField label="Buscar producto">
                    <input
                      type="text"
                      value={productQuery}
                      onChange={(e) => setProductQuery(e.target.value)}
                      placeholder={t.products.search_placeholder}
                      className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] placeholder:text-[var(--text-muted)] w-full"
                    />
                  </FormField>
                  {(productSuggestions.length > 0 || searchLoading) && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-lg">
                      {searchLoading && (
                        <div className="px-4 py-3 text-sm text-[var(--text-muted)]">
                          {t.action.loading}
                        </div>
                      )}
                      {productSuggestions.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addProduct(p)}
                          className="flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-[var(--bg-card-elevated)] transition-colors"
                        >
                          <div className="flex flex-col items-start">
                            <span className="text-[var(--text-primary)] font-medium">
                              {p.name}
                            </span>
                            <span className="text-xs text-[var(--text-muted)]">
                              {p.sku}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-[var(--text-secondary)]">
                              Stock: {p.stock}
                            </span>
                            <Plus size={14} className="text-[var(--accent)]" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Items table */}
                {fields.length > 0 && (
                  <div className="rounded-lg border border-[var(--border)] overflow-hidden">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-[var(--bg-card-elevated)]">
                          <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">
                            Producto
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-[var(--text-secondary)] w-24">
                            {t.sales.quantity}
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-[var(--text-secondary)] w-28">
                            Costo unit.
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-[var(--text-secondary)] w-24">
                            Subtotal
                          </th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((field, idx) => {
                          const qty = parseFloat(
                            watchedItems[idx]?.quantity || "0",
                          );
                          const cost = parseFloat(
                            watchedItems[idx]?.unit_cost_mxn || "0",
                          );
                          const subtotal = qty * cost;
                          return (
                            <tr
                              key={field.id}
                              className="border-t border-[var(--border)] bg-[var(--bg-base)]"
                            >
                              <td className="px-3 py-2 text-[var(--text-primary)]">
                                {field.product_name}
                                <input
                                  type="hidden"
                                  {...register(`items.${idx}.product_id`)}
                                />
                                <input
                                  type="hidden"
                                  {...register(`items.${idx}.product_name`)}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  {...register(`items.${idx}.quantity`, {
                                    required: true,
                                    min: { value: 0.001, message: "Min 0.001" },
                                  })}
                                  type="number"
                                  step="1"
                                  min="1"
                                  className="w-full rounded border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1 text-right text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  {...register(`items.${idx}.unit_cost_mxn`, {
                                    required: true,
                                    min: { value: 0, message: "Min 0" },
                                  })}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="w-full rounded border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1 text-right text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
                                />
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-[var(--text-primary)]">
                                ${subtotal.toFixed(2)}
                              </td>
                              <td className="px-2 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => remove(idx)}
                                  className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {fields.length === 0 && (
                  <p className="rounded-lg border border-dashed border-[var(--border)] py-8 text-center text-sm text-[var(--text-muted)]">
                    Busca y agrega productos usando el campo de arriba
                  </p>
                )}

                {/* Running total */}
                {fields.length > 0 && (
                  <div className="flex justify-end">
                    <div className="rounded-lg bg-[var(--bg-card-elevated)] border border-[var(--border)] px-5 py-3">
                      <span className="text-sm text-[var(--text-secondary)] mr-3">
                        {t.purchases.total_cost}:
                      </span>
                      <span className="text-base font-semibold text-[var(--text-primary)] tabular-nums">
                        ${totalCost.toFixed(2)} MXN
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2 — Review */}
            {step === 2 && (
              <div className="flex flex-col gap-5">
                <div className="rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
                  <div className="px-4 py-3 flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">
                      {t.purchases.supplier}
                    </span>
                    <span className="text-[var(--text-primary)] font-medium">
                      {selectedSupplier?.name ?? "—"}
                    </span>
                  </div>
                  {watch("reference_number") && (
                    <div className="px-4 py-3 flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">
                        {t.purchases.reference}
                      </span>
                      <span className="text-[var(--text-primary)]">
                        {watch("reference_number")}
                      </span>
                    </div>
                  )}
                  {watch("notes") && (
                    <div className="px-4 py-3 flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">
                        Notas
                      </span>
                      <span className="text-[var(--text-primary)] text-right max-w-xs">
                        {watch("notes")}
                      </span>
                    </div>
                  )}
                  <div className="px-4 py-3 flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">
                      Artículos
                    </span>
                    <span className="text-[var(--text-primary)]">
                      {fields.length}
                    </span>
                  </div>
                </div>

                {/* Items summary */}
                <div className="rounded-lg border border-[var(--border)] overflow-hidden">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-[var(--bg-card-elevated)]">
                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">
                          Producto
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-[var(--text-secondary)]">
                          Cant.
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-[var(--text-secondary)]">
                          Costo
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-[var(--text-secondary)]">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {watchedItems.map((item, idx) => {
                        const qty = parseFloat(item.quantity || "0");
                        const cost = parseFloat(item.unit_cost_mxn || "0");
                        return (
                          <tr
                            key={idx}
                            className="border-t border-[var(--border)] bg-[var(--bg-base)]"
                          >
                            <td className="px-3 py-2 text-[var(--text-primary)]">
                              {item.product_name}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                              {qty}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                              ${cost.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-[var(--text-primary)]">
                              ${(qty * cost).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[var(--border)] bg-[var(--bg-card-elevated)]">
                        <td
                          colSpan={3}
                          className="px-3 py-2 text-right text-sm font-medium text-[var(--text-secondary)]"
                        >
                          {t.purchases.total_cost}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-base font-semibold text-[var(--text-primary)]">
                          ${totalCost.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {submitError && (
                  <p className="rounded-lg border border-[var(--error)] bg-[var(--error-subtle)] px-4 py-3 text-sm text-[var(--error)]">
                    {submitError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-4 shrink-0">
            <button
              type="button"
              onClick={step === 0 ? onClose : () => setStep((s) => s - 1)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-elevated)] transition-colors disabled:opacity-50"
            >
              {step === 0 ? (
                t.action.cancel
              ) : (
                <>
                  <ChevronLeft size={15} />
                  {t.action.previous}
                </>
              )}
            </button>

            {step < 2 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance()}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.action.next}
                <ChevronRight size={15} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
              >
                {isSubmitting ? t.action.loading : t.action.confirm}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
