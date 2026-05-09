"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import Decimal from "decimal.js";
import { cn } from "@/lib/utils";
import { formatMXN } from "@/lib/currency";
import { t } from "@/lib/i18n";
import type { CartItem as CartItemType } from "@/store/cart";

interface CartItemProps {
  item: CartItemType;
  canEditPrice: boolean;
  onQuantityChange: (product_id: string, qty: number) => void;
  onDiscountChange: (product_id: string, discount_mxn: string) => void;
  onRemove: (product_id: string) => void;
}

export function CartItem({
  item,
  canEditPrice,
  onQuantityChange,
  onDiscountChange,
  onRemove,
}: CartItemProps) {
  const gross = new Decimal(item.unit_price_mxn).mul(item.quantity);
  const hasDiscount = new Decimal(item.discount_mxn).greaterThan(0);
  const [showDiscount, setShowDiscount] = useState(
    item.discount_mxn !== "0.00" && item.discount_mxn !== "0",
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 border-b border-[var(--border)] px-3 py-2.5",
        "last:border-b-0",
      )}
    >
      {/* Row 1: name + remove */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
            {item.product_name}
          </p>
          <p className="text-xs text-[var(--text-muted)]">{item.product_sku}</p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(item.product_id)}
          aria-label={`Eliminar ${item.product_name}`}
          className={cn(
            "flex-shrink-0 rounded p-1 text-[var(--text-muted)]",
            "transition-colors hover:bg-[var(--error-subtle)] hover:text-[var(--error)]",
          )}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Row 2: quantity stepper + price + subtotal */}
      <div className="flex items-center gap-2">
        {/* Quantity stepper */}
        <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg-input)]">
          <button
            type="button"
            onClick={() => onQuantityChange(item.product_id, item.quantity - 1)}
            aria-label="Reducir cantidad"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-l-lg",
              "text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-elevated)]",
            )}
          >
            <Minus size={12} />
          </button>
          <input
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => {
              const val = Math.max(1, parseInt(e.target.value, 10) || 1);
              onQuantityChange(item.product_id, val);
            }}
            className={cn(
              "h-7 w-10 bg-transparent text-center text-sm font-medium",
              "text-[var(--text-primary)] outline-none",
              "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            )}
          />
          <button
            type="button"
            onClick={() => onQuantityChange(item.product_id, item.quantity + 1)}
            aria-label="Aumentar cantidad"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-r-lg",
              "text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-elevated)]",
            )}
          >
            <Plus size={12} />
          </button>
        </div>

        {/* Unit price */}
        <span className="flex-1 text-right text-xs text-[var(--text-muted)]">
          {formatMXN(item.unit_price_mxn)} c/u
        </span>

        {/* Subtotal */}
        <span className="w-20 text-right text-sm font-semibold tabular-nums text-[var(--text-primary)]">
          {formatMXN(item.subtotal_mxn)}
        </span>
      </div>

      {/* Row 3: discount */}
      {canEditPrice && (
        <div className="flex items-center gap-2">
          {showDiscount ? (
            <>
              <label
                htmlFor={`discount-${item.product_id}`}
                className="text-xs text-[var(--text-muted)]"
              >
                {t.sales.discount}:
              </label>
              <input
                id={`discount-${item.product_id}`}
                type="number"
                min="0"
                step="0.01"
                value={item.discount_mxn === "0.00" ? "" : item.discount_mxn}
                placeholder="0.00"
                onChange={(e) => {
                  const raw = e.target.value;
                  onDiscountChange(item.product_id, raw === "" ? "0.00" : raw);
                }}
                className={cn(
                  "w-24 rounded border border-[var(--border)] bg-[var(--bg-input)]",
                  "px-2 py-0.5 text-right text-xs text-[var(--text-primary)] outline-none",
                  "focus:border-[var(--border-focus)]",
                  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                )}
              />
              {!hasDiscount && (
                <button
                  type="button"
                  onClick={() => {
                    onDiscountChange(item.product_id, "0");
                    setShowDiscount(false);
                  }}
                  className="text-[10px] text-[var(--text-muted)] hover:text-[var(--error)] transition-colors ml-1"
                  aria-label="Quitar descuento"
                >
                  ×
                </button>
              )}
              {hasDiscount && (
                <span className="text-xs text-[var(--text-muted)]">
                  bruto {formatMXN(gross.toFixed(2))}
                </span>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowDiscount(true)}
              className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
            >
              + Descuento
            </button>
          )}
        </div>
      )}
      {/* Show discount read-only for cashier when one exists */}
      {!canEditPrice && hasDiscount && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">
            {t.sales.discount}:
          </span>
          <span className="text-xs text-[var(--warning)]">
            -{formatMXN(item.discount_mxn)}
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            bruto {formatMXN(gross.toFixed(2))}
          </span>
        </div>
      )}
    </div>
  );
}
