"use client";

import { Printer, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { formatMXN, formatUSD } from "@/lib/currency";
import { formatDate } from "@/lib/utils";
import type { SaleRead } from "@/types/index";

const METHOD_LABELS: Record<string, string> = {
  cash_mxn: t.payment.cash_mxn,
  cash_usd: t.payment.cash_usd,
  credit_card: t.payment.credit_card,
  debit_card: t.payment.debit_card,
  gift_card: t.payment.gift_card,
  loyalty_points: t.payment.loyalty_points,
  transfer: t.payment.transfer,
};

interface ReceiptModalProps {
  sale: SaleRead;
  onNewSale: () => void;
}

export function ReceiptModal({ sale, onNewSale }: ReceiptModalProps) {
  function handlePrint() {
    window.print();
  }

  const hasChange =
    parseFloat(sale.total_mxn) <
    sale.payments.reduce((s, p) => s + parseFloat(p.amount_mxn), 0);

  const totalPaid = sale.payments.reduce(
    (s, p) => s + parseFloat(p.amount_mxn),
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
            {parseFloat(sale.discount_total_mxn) > 0 && (
              <div className="flex justify-between text-sm text-[var(--warning)]">
                <span>{t.sales.discount}</span>
                <span className="tabular-nums">
                  -{formatMXN(sale.discount_total_mxn)}
                </span>
              </div>
            )}
            {parseFloat(sale.tax_total_mxn) > 0 && (
              <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                <span>{t.sales.tax}</span>
                <span className="tabular-nums">
                  {formatMXN(sale.tax_total_mxn)}
                </span>
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
                    {METHOD_LABELS[p.method] ?? p.method}
                    {p.terminal_reference && (
                      <span className="ml-1 text-xs text-[var(--text-muted)]">
                        #{p.terminal_reference}
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums">
                    {p.method === "cash_usd" && p.amount_usd
                      ? `${formatUSD(p.amount_usd)} = ${formatMXN(p.amount_mxn)}`
                      : formatMXN(p.amount_mxn)}
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

        {/* Actions */}
        <div className="flex gap-2 border-t border-[var(--border)] p-4 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg border",
              "border-[var(--border)] bg-[var(--bg-card-elevated)] py-2.5 text-sm font-medium",
              "text-[var(--text-secondary)] transition-colors hover:bg-[var(--border)]",
            )}
          >
            <Printer size={16} />
            {t.action.print}
          </button>
          <button
            type="button"
            onClick={onNewSale}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5",
              "bg-[var(--accent)] text-sm font-semibold text-white",
              "transition-colors hover:bg-[var(--accent-hover)]",
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
