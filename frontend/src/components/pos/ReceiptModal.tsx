"use client";

import { useState } from "react";
import { Printer, ShoppingCart, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { formatMXN, formatUSD } from "@/lib/currency";
import { formatDate } from "@/lib/utils";
import { salesApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { SaleRead } from "@/types/index";

function methodLabel(method: string, currency: string): string {
  if (method === "cash")
    return currency === "USD" ? t.payment.cash_usd : t.payment.cash_mxn;
  const labels: Record<string, string> = {
    credit_card: t.payment.credit_card,
    debit_card: t.payment.debit_card,
    gift_card: t.payment.gift_card,
    loyalty_points: t.payment.loyalty_points,
    transfer: t.payment.transfer,
  };
  return labels[method] ?? method;
}

interface ReceiptModalProps {
  sale: SaleRead;
  onNewSale: () => void;
}

export function ReceiptModal({ sale, onNewSale }: ReceiptModalProps) {
  const { token } = useAuth();
  const [printState, setPrintState] = useState<
    "idle" | "printing" | "ok" | "error"
  >("idle");
  const [printError, setPrintError] = useState<string | null>(null);

  async function handlePrint() {
    setPrintState("printing");
    setPrintError(null);
    try {
      await salesApi.printReceipt(token, sale.id);
      setPrintState("ok");
      // Auto-reset after 3 s so the button is usable again
      setTimeout(() => setPrintState("idle"), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error de impresión";
      // If Print Bridge is not configured/available, fall back to browser print
      if (
        msg.includes("no habilitado") ||
        msg.includes("No hay impresora") ||
        msg.includes("502") ||
        msg.includes("503") ||
        msg.includes("504")
      ) {
        setPrintState("idle");
        window.print();
      } else {
        setPrintState("error");
        setPrintError(msg);
        setTimeout(() => setPrintState("idle"), 4000);
      }
    }
  }

  const hasChange =
    parseFloat(sale.total_mxn) <
    sale.payments.reduce((s, p) => s + parseFloat(p.amount_in_mxn), 0);

  const totalPaid = sale.payments.reduce(
    (s, p) => s + parseFloat(p.amount_in_mxn),
    0,
  );
  const change = Math.max(0, totalPaid - parseFloat(sale.total_mxn));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      aria-labelledby="receipt-title"
    >
      <div
        className={cn(
          "w-full max-w-sm overflow-hidden rounded-xl border border-[var(--border)]",
          "bg-[var(--receipt-bg)] shadow-[var(--shadow-modal)]",
          "print:border-none print:shadow-none",
        )}
      >
        {/* Receipt header */}
        <div className="bg-[var(--accent)] px-5 py-4 text-center text-white">
          <p className="text-xs font-medium uppercase tracking-widest opacity-80">
            {t.sales.receipt}
          </p>
          <h2
            id="receipt-title"
            className="mt-1 text-2xl font-bold tracking-tight"
          >
            {sale.folio}
          </h2>
          <p className="mt-0.5 text-xs opacity-70">
            {formatDate(sale.created_at)}
          </p>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {/* Customer */}
          {sale.customer_name && (
            <p className="mb-3 text-sm text-[var(--text-secondary)]">
              <span className="font-medium">{t.sales.customer}:</span>{" "}
              {sale.customer_name}
            </p>
          )}

          {/* Items */}
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {t.sales.items}
            </p>
            <div className="flex flex-col divide-y divide-[var(--border)]">
              {sale.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-2 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {item.product_name_snapshot}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {item.product_sku_snapshot} × {String(item.quantity)} @{" "}
                      {formatMXN(item.unit_price_mxn)}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                    {formatMXN(item.subtotal_mxn)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="mb-4 flex flex-col gap-1 border-t border-[var(--border)] pt-3">
            <div className="flex justify-between text-sm text-[var(--text-secondary)]">
              <span>{t.sales.subtotal}</span>
              <span className="tabular-nums">
                {formatMXN(sale.subtotal_mxn)}
              </span>
            </div>
            {parseFloat(sale.discount_mxn) > 0 && (
              <div className="flex justify-between text-sm text-[var(--warning)]">
                <span>{t.sales.discount}</span>
                <span className="tabular-nums">
                  -{formatMXN(sale.discount_mxn)}
                </span>
              </div>
            )}
            {parseFloat(sale.tax_mxn) > 0 && (
              <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                <span>{t.sales.tax}</span>
                <span className="tabular-nums">{formatMXN(sale.tax_mxn)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-[var(--border)] pt-2 text-base font-bold text-[var(--text-primary)]">
              <span>{t.sales.total}</span>
              <div className="flex flex-col items-end">
                <span className="tabular-nums">
                  {formatMXN(sale.total_mxn)}
                </span>
                <span className="text-xs font-normal text-[var(--text-muted)]">
                  {formatUSD(sale.total_usd)} USD
                </span>
              </div>
            </div>
          </div>

          {/* Payments */}
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {t.payment.method}
            </p>
            <div className="flex flex-col gap-1">
              {sale.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between text-sm text-[var(--text-secondary)]"
                >
                  <span>
                    {methodLabel(p.method, p.currency)}
                    {p.terminal_reference && (
                      <span className="ml-1 text-xs text-[var(--text-muted)]">
                        #{p.terminal_reference}
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums">
                    {p.currency === "USD"
                      ? `${formatUSD(p.amount)} = ${formatMXN(p.amount_in_mxn)}`
                      : formatMXN(p.amount_in_mxn)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Change */}
          {hasChange && (
            <div className="flex justify-between rounded-lg bg-[var(--success-subtle)] px-3 py-2 text-sm font-semibold text-[var(--success)]">
              <span>{t.sales.change}</span>
              <span className="tabular-nums">
                {formatMXN(change.toFixed(2))}
              </span>
            </div>
          )}
        </div>

        {/* Print error banner */}
        {printState === "error" && printError && (
          <div className="mx-4 mb-0 flex items-center gap-2 rounded-lg border border-[var(--error)] bg-[var(--error-subtle)] px-3 py-2 text-xs text-[var(--error)]">
            <AlertCircle size={13} className="shrink-0" />
            {printError}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 border-t border-[var(--border)] p-4 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            disabled={printState === "printing"}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium",
              "transition active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
              printState === "ok"
                ? "border-[var(--success)] bg-[var(--success-subtle)] text-[var(--success)]"
                : "border-[var(--border)] bg-[var(--bg-card-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border)]",
            )}
          >
            {printState === "ok" ? (
              <CheckCircle size={16} />
            ) : (
              <Printer size={16} />
            )}
            {printState === "printing"
              ? "Imprimiendo…"
              : printState === "ok"
                ? "Impreso"
                : t.action.print}
          </button>
          <button
            type="button"
            onClick={onNewSale}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5",
              "bg-[var(--accent)] text-sm font-semibold text-white",
              "transition hover:bg-[var(--accent-hover)] active:scale-[0.96]",
            )}
          >
            <ShoppingCart size={16} />
            {t.sales.new_sale}
          </button>
        </div>
      </div>
    </div>
  );
}
