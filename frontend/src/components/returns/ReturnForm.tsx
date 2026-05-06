"use client";

import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { Search, ChevronRight, ChevronLeft } from "lucide-react";
import { FormField, CurrencyDisplay } from "@/components/ui";
import { salesApi, returnsApi, type SaleRead } from "@/lib/api";
import type { ReturnRead } from "@/types/index";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ReturnFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (ret: ReturnRead) => void;
}

type Step = 1 | 2 | 3 | 4;
type RefundMethod = "cash" | "gift_card" | "store_credit";

interface ReturnItem {
  product_id: string;
  product_name: string;
  original_qty: number;
  return_qty: number;
  unit_price: string;
  checked: boolean;
}

const STEP_LABELS: Record<Step, string> = {
  1: "Buscar venta",
  2: "Seleccionar artículos",
  3: "Método de reembolso",
  4: "Confirmar",
};

const inputClass =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:outline-none transition-colors";

export function ReturnForm({ isOpen, onClose, onCreated }: ReturnFormProps) {
  const { token } = useAuth();

  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [folioInput, setFolioInput] = useState("");
  const [sale, setSale] = useState<SaleRead | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [isLooking, setIsLooking] = useState(false);

  // Step 2
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [itemsError, setItemsError] = useState("");

  // Step 3
  const [refundMethod, setRefundMethod] = useState<RefundMethod>("cash");
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  // Step 4 / submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  function resetAll() {
    setStep(1);
    setFolioInput("");
    setSale(null);
    setLookupError("");
    setItems([]);
    setItemsError("");
    setRefundMethod("cash");
    setReason("");
    setReasonError("");
    setApiError("");
  }

  function handleClose() {
    resetAll();
    onClose();
  }

  // ── Step 1: lookup sale ──────────────────────────────────────────────────
  async function handleLookupSale(e: React.FormEvent) {
    e.preventDefault();
    if (!folioInput.trim()) return;
    setIsLooking(true);
    setLookupError("");
    setSale(null);
    try {
      // Try by folio first (list with filter), then by id
      let found: SaleRead | null = null;
      try {
        const list = await salesApi.list(token, { folio: folioInput.trim() });
        found = list[0] ?? null;
      } catch {
        // fallback: treat input as id
      }
      if (!found) {
        found = await salesApi.get(token, folioInput.trim());
      }
      if (!found) throw new Error("Venta no encontrada");
      if (found.status === "cancelled")
        throw new Error("La venta está cancelada");
      setSale(found);
      // Seed items from sale
      setItems(
        found.items.map((si) => ({
          product_id: si.product_id,
          product_name: si.product_name,
          original_qty: Number(si.quantity),
          return_qty: Number(si.quantity),
          unit_price: si.unit_price,
          checked: true,
        })),
      );
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : t.error.generic);
    } finally {
      setIsLooking(false);
    }
  }

  function goToStep2() {
    if (!sale) return;
    setStep(2);
  }

  // ── Step 2: item selection ───────────────────────────────────────────────
  function toggleItem(idx: number) {
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? {
              ...it,
              checked: !it.checked,
              return_qty: !it.checked ? it.original_qty : 0,
            }
          : it,
      ),
    );
    setItemsError("");
  }

  function setReturnQty(idx: number, val: string) {
    const num = Math.max(
      0,
      Math.min(parseInt(val) || 0, items[idx].original_qty),
    );
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx ? { ...it, return_qty: num, checked: num > 0 } : it,
      ),
    );
    setItemsError("");
  }

  function validateItems(): boolean {
    const hasAny = items.some((it) => it.checked && it.return_qty > 0);
    if (!hasAny) {
      setItemsError("Selecciona al menos un artículo para devolver");
      return false;
    }
    return true;
  }

  function goToStep3() {
    if (!validateItems()) return;
    setStep(3);
  }

  // ── Step 3: refund method + reason ───────────────────────────────────────
  function validateStep3(): boolean {
    if (!reason.trim()) {
      setReasonError(t.error.required);
      return false;
    }
    setReasonError("");
    return true;
  }

  function goToStep4() {
    if (!validateStep3()) return;
    setStep(4);
  }

  // ── Calculated total ─────────────────────────────────────────────────────
  const totalRefund = items
    .filter((it) => it.checked && it.return_qty > 0)
    .reduce((sum, it) => sum + parseFloat(it.unit_price) * it.return_qty, 0)
    .toFixed(2);

  // ── Step 4: submit ───────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!sale) return;
    setIsSubmitting(true);
    setApiError("");
    try {
      const payload = {
        original_sale_id: sale.id,
        items: items
          .filter((it) => it.checked && it.return_qty > 0)
          .map((it) => ({
            product_id: it.product_id,
            quantity: it.return_qty,
            unit_price: it.unit_price,
            subtotal: (parseFloat(it.unit_price) * it.return_qty).toFixed(2),
          })),
        total_mxn: totalRefund,
        refund_method: refundMethod,
        reason: reason.trim(),
      };
      const created = await returnsApi.create(token, payload);
      onCreated(created);
      resetAll();
      onClose();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : t.error.generic);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Step indicator ───────────────────────────────────────────────────────
  function StepIndicator() {
    const steps: Step[] = [1, 2, 3, 4];
    return (
      <div className="flex items-center gap-2 mb-1">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors",
                s < step
                  ? "bg-[var(--success)] text-white"
                  : s === step
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--bg-card-elevated)] text-[var(--text-muted)]",
              )}
            >
              {s < step ? "✓" : s}
            </div>
            <span
              className={cn(
                "text-xs hidden sm:inline",
                s === step
                  ? "text-[var(--text-primary)] font-medium"
                  : "text-[var(--text-muted)]",
              )}
            >
              {STEP_LABELS[s]}
            </span>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-px w-4 sm:w-8",
                  s < step ? "bg-[var(--success)]" : "bg-[var(--border)]",
                )}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="2xl"
      isDismissable={!isSubmitting}
      classNames={{
        base: "bg-[var(--bg-card)] border border-[var(--border)]",
        header: "text-[var(--text-primary)] border-b border-[var(--border)]",
        body: "text-[var(--text-secondary)]",
        footer: "border-t border-[var(--border)]",
      }}
    >
      <ModalContent>
        <ModalHeader>
          <div className="flex flex-col gap-2">
            <span>{t.returns.new_return}</span>
            <StepIndicator />
          </div>
        </ModalHeader>

        <ModalBody>
          {apiError && (
            <p className="mb-3 rounded-lg border border-[var(--error)] px-3 py-2 text-sm text-[var(--error)]">
              {apiError}
            </p>
          )}

          {/* ── Step 1 ── */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-[var(--text-muted)]">
                Ingresa el folio o ID de la venta original.
              </p>
              <form onSubmit={handleLookupSale} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej. VTA-000001"
                  value={folioInput}
                  onChange={(e) => {
                    setFolioInput(e.target.value);
                    setSale(null);
                    setLookupError("");
                  }}
                  className={cn(inputClass, "flex-1")}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isLooking || !folioInput.trim()}
                  className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--bg-card-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--accent-subtle)] disabled:opacity-40 transition-colors"
                >
                  <Search size={14} aria-hidden />
                  {isLooking ? t.action.loading : t.action.search}
                </button>
              </form>

              {lookupError && (
                <p className="text-sm text-[var(--error)]">{lookupError}</p>
              )}

              {sale && (
                <div className="rounded-lg border border-[var(--success)] bg-[var(--bg-card-elevated)] p-4 text-sm">
                  <p className="font-medium text-[var(--text-primary)] mb-2">
                    Venta encontrada: {sale.folio}
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    <span className="text-[var(--text-muted)]">Fecha</span>
                    <span className="text-[var(--text-primary)]">
                      {formatDate(sale.created_at)}
                    </span>
                    <span className="text-[var(--text-muted)]">
                      {t.sales.items}
                    </span>
                    <span className="text-[var(--text-primary)]">
                      {sale.items.length}
                    </span>
                    <span className="text-[var(--text-muted)]">
                      {t.payment.total}
                    </span>
                    <span className="text-[var(--text-primary)] font-semibold">
                      <CurrencyDisplay amount={sale.total_mxn} />
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-[var(--text-muted)]">
                Selecciona los artículos y la cantidad a devolver.
              </p>
              {itemsError && (
                <p className="text-sm text-[var(--error)]">{itemsError}</p>
              )}
              <div className="w-full overflow-x-auto rounded-lg border border-[var(--border)]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[var(--bg-card-elevated)]">
                      <th className="w-10 px-3 py-2 border-b border-[var(--border)]" />
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] border-b border-[var(--border)]">
                        Nombre
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-secondary)] border-b border-[var(--border)]">
                        Cant. original
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-secondary)] border-b border-[var(--border)]">
                        Cant. a devolver
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-secondary)] border-b border-[var(--border)]">
                        Precio
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr
                        key={it.product_id + idx}
                        className={cn(
                          "border-b border-[var(--border)] last:border-0 transition-colors",
                          it.checked
                            ? "bg-[var(--bg-base)]"
                            : "bg-[var(--bg-card)] opacity-60",
                        )}
                      >
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={it.checked}
                            onChange={() => toggleItem(idx)}
                            className="h-4 w-4 accent-[var(--accent)]"
                          />
                        </td>
                        <td className="px-4 py-3 text-[var(--text-primary)]">
                          {it.product_name}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[var(--text-muted)]">
                          {it.original_qty}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            min={0}
                            max={it.original_qty}
                            value={it.return_qty}
                            onChange={(e) => setReturnQty(idx, e.target.value)}
                            disabled={!it.checked}
                            className="w-20 rounded border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1 text-right text-sm text-[var(--text-primary)] disabled:opacity-40"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <CurrencyDisplay amount={it.unit_price} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Step 3 ── */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-[var(--text-muted)]">
                Selecciona cómo se hará el reembolso e indica el motivo.
              </p>

              {/* Refund method radio group */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {t.returns.refund_method}
                </p>
                {(
                  [
                    { value: "cash", label: t.returns.refund.cash },
                    { value: "gift_card", label: t.returns.refund.gift_card },
                    {
                      value: "store_credit",
                      label: t.returns.refund.store_credit,
                    },
                  ] as { value: RefundMethod; label: string }[]
                ).map(({ value, label }) => (
                  <label
                    key={value}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors",
                      refundMethod === value
                        ? "border-[var(--accent)] bg-[var(--accent-subtle)]"
                        : "border-[var(--border)] hover:bg-[var(--bg-card-elevated)]",
                    )}
                  >
                    <input
                      type="radio"
                      name="refund_method"
                      value={value}
                      checked={refundMethod === value}
                      onChange={() => setRefundMethod(value)}
                      className="accent-[var(--accent)]"
                    />
                    <span className="text-sm text-[var(--text-primary)]">
                      {label}
                    </span>
                  </label>
                ))}
              </div>

              {/* Total to refund */}
              <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card-elevated)] px-4 py-3">
                <span className="text-sm text-[var(--text-muted)]">
                  {t.returns.total_returned}
                </span>
                <CurrencyDisplay amount={totalRefund} size="lg" />
              </div>

              {/* Reason */}
              <FormField label={t.returns.reason} required error={reasonError}>
                <textarea
                  rows={3}
                  placeholder="Describe el motivo de la devolución"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (e.target.value.trim()) setReasonError("");
                  }}
                  className={cn(inputClass, "resize-none")}
                />
              </FormField>
            </div>
          )}

          {/* ── Step 4 ── */}
          {step === 4 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Resumen de la devolución
              </p>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card-elevated)] p-4 text-sm">
                <span className="text-[var(--text-muted)]">Venta original</span>
                <span className="font-mono font-medium text-[var(--text-primary)]">
                  {sale?.folio}
                </span>

                <span className="text-[var(--text-muted)]">
                  {t.returns.refund_method}
                </span>
                <span className="text-[var(--text-primary)]">
                  {refundMethod === "cash"
                    ? t.returns.refund.cash
                    : refundMethod === "gift_card"
                      ? t.returns.refund.gift_card
                      : t.returns.refund.store_credit}
                </span>

                <span className="text-[var(--text-muted)]">
                  {t.returns.reason}
                </span>
                <span className="text-[var(--text-primary)]">{reason}</span>
              </div>

              <div className="w-full overflow-x-auto rounded-lg border border-[var(--border)]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[var(--bg-card-elevated)]">
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] border-b border-[var(--border)]">
                        Producto
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-secondary)] border-b border-[var(--border)]">
                        Cant.
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-secondary)] border-b border-[var(--border)]">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items
                      .filter((it) => it.checked && it.return_qty > 0)
                      .map((it, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-[var(--border)] last:border-0"
                        >
                          <td className="px-4 py-3 text-[var(--text-primary)]">
                            {it.product_name}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-[var(--text-primary)]">
                            {it.return_qty}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <CurrencyDisplay
                              amount={(
                                parseFloat(it.unit_price) * it.return_qty
                              ).toFixed(2)}
                            />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card-elevated)] px-6 py-3 flex items-center gap-6">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">
                    {t.returns.total_returned}
                  </span>
                  <CurrencyDisplay amount={totalRefund} size="lg" />
                </div>
              </div>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          {/* Back button */}
          {step > 1 && (
            <Button
              type="button"
              variant="bordered"
              onPress={() => setStep((s) => (s - 1) as Step)}
              isDisabled={isSubmitting}
              className="border-[var(--border)] text-[var(--text-secondary)] mr-auto"
            >
              <ChevronLeft size={15} aria-hidden />
              {t.action.previous}
            </Button>
          )}

          <Button
            type="button"
            variant="bordered"
            onPress={handleClose}
            isDisabled={isSubmitting}
            className="border-[var(--border)] text-[var(--text-secondary)]"
          >
            {t.action.cancel}
          </Button>

          {/* Next / Submit */}
          {step === 1 && (
            <Button
              type="button"
              onPress={goToStep2}
              isDisabled={!sale}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white border-0 font-medium"
            >
              {t.action.next}
              <ChevronRight size={15} aria-hidden />
            </Button>
          )}
          {step === 2 && (
            <Button
              type="button"
              onPress={goToStep3}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white border-0 font-medium"
            >
              {t.action.next}
              <ChevronRight size={15} aria-hidden />
            </Button>
          )}
          {step === 3 && (
            <Button
              type="button"
              onPress={goToStep4}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white border-0 font-medium"
            >
              {t.action.next}
              <ChevronRight size={15} aria-hidden />
            </Button>
          )}
          {step === 4 && (
            <Button
              type="button"
              onPress={handleSubmit}
              isLoading={isSubmitting}
              isDisabled={isSubmitting}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white border-0 font-medium"
            >
              Procesar devolución
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
