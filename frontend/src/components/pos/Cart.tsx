"use client";

import { ShoppingCart, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { formatMXN, formatUSD, mxnToUsd } from "@/lib/currency";
import { CartItem } from "./CartItem";
import { CustomerSelector } from "./CustomerSelector";
import { useCartStore } from "@/store/cart";
import type { AuthUser } from "@/store/auth";

interface CartProps {
  token: string;
  user: AuthUser;
  fxRate: number;
}

export function Cart({ token, user, fxRate }: CartProps) {
  const items = useCartStore((s) => s.items);
  const customer_id = useCartStore((s) => s.customer_id);
  const customer_name = useCartStore((s) => s.customer_name);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const updateDiscount = useCartStore((s) => s.updateDiscount);
  const removeItem = useCartStore((s) => s.removeItem);
  const setCustomer = useCartStore((s) => s.setCustomer);
  const clearCart = useCartStore((s) => s.clearCart);
  const subtotal_mxn = useCartStore((s) => s.subtotal_mxn)();
  const total_mxn = useCartStore((s) => s.total_mxn)();

  const canEditPrice = user.role === "admin" || user.role === "supervisor";

  const totalUSD = mxnToUsd(parseFloat(total_mxn), fxRate);
  const hasDiscount = parseFloat(subtotal_mxn) !== parseFloat(total_mxn);

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: "var(--cart-bg)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {t.nav.pos}
          </span>
          {items.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
              {items.reduce((a, i) => a + i.quantity, 0)}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className={cn(
              "flex items-center gap-1 rounded px-2 py-1 text-xs",
              "text-[var(--text-muted)] transition-colors hover:bg-[var(--error-subtle)] hover:text-[var(--error)]",
            )}
          >
            <Trash2 size={12} />
            {t.action.clear}
          </button>
        )}
      </div>

      {/* Items list */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <ShoppingCart size={40} className="text-[var(--border)]" />
            <p className="text-sm text-[var(--text-muted)]">
              {t.sales.cart_empty}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {items.map((item) => (
              <CartItem
                key={item.product_id}
                item={item}
                canEditPrice={canEditPrice}
                onQuantityChange={updateQuantity}
                onDiscountChange={updateDiscount}
                onRemove={removeItem}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer: customer + totals */}
      {items.length > 0 && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          {/* Customer selector */}
          <div className="mb-3">
            <CustomerSelector
              token={token}
              selectedId={customer_id}
              selectedName={customer_name}
              onSelect={setCustomer}
            />
          </div>

          {/* Totals */}
          <div className="flex flex-col gap-1">
            {hasDiscount && (
              <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                <span>{t.sales.subtotal}</span>
                <span className="tabular-nums">{formatMXN(subtotal_mxn)}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between">
              <span className="text-base font-bold text-[var(--text-primary)]">
                {t.sales.total}
              </span>
              <div className="flex flex-col items-end">
                <span className="text-xl font-bold tabular-nums text-[var(--text-primary)]">
                  {formatMXN(total_mxn)}
                </span>
                {fxRate > 0 && (
                  <span className="text-xs tabular-nums text-[var(--text-muted)]">
                    {formatUSD(totalUSD)} USD
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
