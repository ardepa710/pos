"use client";

import { useState, useRef, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2, X } from "lucide-react";
import { t } from "@/lib/i18n";
import { purchasesApi, productsApi } from "@/lib/api";
import type { SupplierRead } from "@/types/index";
import type { ProductRead } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { FormField } from "@/components/ui";

interface ConsignmentInFormProps {
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

export function ConsignmentInForm({
  suppliers,
  onClose,
  onSuccess,
}: ConsignmentInFormProps) {
  const { token } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
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
    if (data.items.length === 0) {
      setSubmitError("Agrega al menos un artículo.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await purchasesApi.create(token, {
        supplier_id: data.supplier_id,
        purchase_type: "consignment_in",
        reference_number: data.reference_number || undefined,
        notes: data.notes || undefined,
        items: data.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost_mxn,
        })),
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
      <div className="relative flex flex-col w-full max-w-2xl max-h-[90vh] rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Nueva consignación
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Registra mercancía recibida en consignación
            </p>
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

        {/* Body */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col min-h-0 flex-1"
        >
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
            {/* Supplier + reference */}
            <div className="grid grid-cols-2 gap-4">
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
                      {s.legal_name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label={t.purchases.reference}>
                <input
                  {...register("reference_number")}
                  type="text"
                  placeholder="Ej: CON-00001"
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] placeholder:text-[var(--text-muted)]"
                />
              </FormField>
            </div>

            <FormField label="Notas">
              <textarea
                {...register("notes")}
                rows={2}
                placeholder="Condiciones de la consignación, fecha de revisión, etc."
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] placeholder:text-[var(--text-muted)] resize-none"
              />
            </FormField>

            {/* Product search */}
            <div className="relative">
              <FormField label="Agregar producto">
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
                      <Plus
                        size={14}
                        className="text-[var(--accent)] shrink-0"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Items */}
            {fields.length > 0 ? (
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
                                min: { value: 1, message: "Min 1" },
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
                            ${(qty * cost).toFixed(2)}
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
            ) : (
              <p className="rounded-lg border border-dashed border-[var(--border)] py-8 text-center text-sm text-[var(--text-muted)]">
                Busca y agrega productos de consignación
              </p>
            )}

            {fields.length > 0 && (
              <div className="flex justify-end">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card-elevated)] px-5 py-3">
                  <span className="text-sm text-[var(--text-secondary)] mr-3">
                    Valor total:
                  </span>
                  <span className="tabular-nums text-base font-semibold text-[var(--text-primary)]">
                    ${totalCost.toFixed(2)} MXN
                  </span>
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
              disabled={isSubmitting || fields.length === 0}
              className="rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {isSubmitting ? t.action.loading : "Registrar consignación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
