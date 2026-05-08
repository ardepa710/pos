"use client";

import { X } from "lucide-react";
import { t } from "@/lib/i18n";
import type { PurchaseRead, SupplierRead } from "@/types/index";
import { StatusBadge, CurrencyDisplay } from "@/components/ui";

interface PurchaseDetailProps {
  purchase: PurchaseRead;
  suppliers: SupplierRead[];
  onClose: () => void;
}

export function PurchaseDetail({
  purchase,
  suppliers,
  onClose,
}: PurchaseDetailProps) {
  const supplier = suppliers.find((s) => s.id === purchase.supplier_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[90vh] rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Compra{" "}
              <span className="font-mono text-base text-[var(--text-secondary)]">
                {purchase.folio}
              </span>
            </h2>
            <StatusBadge status={purchase.status} size="sm" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-card-elevated)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* Meta */}
          <div className="rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
            <div className="grid grid-cols-2 divide-x divide-[var(--border)]">
              <div className="px-4 py-3">
                <p className="text-xs text-[var(--text-muted)] mb-0.5">
                  {t.purchases.supplier}
                </p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {supplier?.legal_name ?? purchase.supplier_id}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-[var(--text-muted)] mb-0.5">Fecha</p>
                <p className="text-sm text-[var(--text-primary)] tabular-nums">
                  {new Date(purchase.created_at).toLocaleDateString("es-MX", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            {purchase.folio && (
              <div className="px-4 py-3">
                <p className="text-xs text-[var(--text-muted)] mb-0.5">
                  {t.purchases.reference}
                </p>
                <p className="text-sm text-[var(--text-primary)]">
                  {purchase.folio}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 divide-x divide-[var(--border)]">
              <div className="px-4 py-3">
                <p className="text-xs text-[var(--text-muted)] mb-0.5">Tipo</p>
                <p className="text-sm text-[var(--text-primary)]">
                  {purchase.purchase_type === "consignment_in"
                    ? t.purchases.consignment
                    : "Normal"}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-[var(--text-muted)] mb-0.5">
                  Estado
                </p>
                <StatusBadge status={purchase.status} size="sm" />
              </div>
            </div>
          </div>

          {/* Items table */}
          <div>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
              Artículos
            </h3>
            <div className="rounded-lg border border-[var(--border)] overflow-hidden">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-card-elevated)]">
                    <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">
                      {t.products.name}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-[var(--text-secondary)] w-20">
                      {t.sales.quantity}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-[var(--text-secondary)] w-28">
                      Costo unit.
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-[var(--text-secondary)] w-28">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(purchase.items?.length ?? 0) > 0 ? (
                    purchase.items!.map((item, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-[var(--border)] bg-[var(--bg-base)] hover:bg-[var(--bg-card-elevated)] transition-colors"
                      >
                        <td className="px-3 py-2.5">
                          <p className="text-[var(--text-primary)] font-medium">
                            {item.product_name}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-secondary)]">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <CurrencyDisplay amount={item.unit_cost} size="sm" />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <CurrencyDisplay amount={item.subtotal} size="sm" />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-6 text-center text-sm text-[var(--text-muted)]"
                      >
                        Sin artículos registrados
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--border)] bg-[var(--bg-card-elevated)]">
                    <td
                      colSpan={3}
                      className="px-3 py-2.5 text-right text-sm font-medium text-[var(--text-secondary)]"
                    >
                      {t.purchases.total_cost}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <CurrencyDisplay amount={purchase.total} size="sm" />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          {purchase.notes && (
            <div className="rounded-lg border border-[var(--border)] px-4 py-3">
              <p className="text-xs text-[var(--text-muted)] mb-1">Notas</p>
              <p className="text-sm text-[var(--text-primary)]">
                {purchase.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-[var(--border)] px-6 py-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-5 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-elevated)] transition-colors"
          >
            {t.action.close}
          </button>
        </div>
      </div>
    </div>
  );
}
