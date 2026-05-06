"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Decimal from "decimal.js";
import { salesApi } from "@/lib/api";
import type { ProductRead } from "@/lib/api";
import type { SaleRead, CashierSessionRead } from "@/types/index";
import { useCartStore } from "@/store/cart";
import { useAuth } from "@/hooks/useAuth";
import { ProductGrid } from "./ProductGrid";
import { Cart } from "./Cart";
import { PaymentPanel } from "./PaymentPanel";
import { OpenSessionModal } from "./OpenSessionModal";
import { ReceiptModal } from "./ReceiptModal";
import { LoadingSpinner } from "@/components/ui";

// Shape expected by PaymentPanel's onCharge callback
interface PendingPayment {
  id: string;
  method: string;
  amount_mxn: string;
  amount_usd?: string;
  terminal_reference?: string;
}

export function POSTerminal() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  const addItem = useCartStore((s) => s.addItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const items = useCartStore((s) => s.items);
  const customer_id = useCartStore((s) => s.customer_id);
  const notes = useCartStore((s) => s.notes);
  const total_mxn = useCartStore((s) => s.total_mxn)();

  const [session, setSession] = useState<CashierSessionRead | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [completedSale, setCompletedSale] = useState<SaleRead | null>(null);
  const [charging, setCharging] = useState(false);

  // ── Session check ──────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      try {
        const s = await salesApi.currentSession(token);
        if (!cancelled) setSession(s);
      } catch {
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    }
    checkSession();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // ── FX rate ────────────────────────────────────────────────────────────

  const { data: fxData } = useQuery({
    queryKey: ["fx-rate", token],
    queryFn: () => salesApi.fxRate(token),
    staleTime: 10 * 60 * 1000,
    enabled: !!session,
  });

  const fxRate = fxData ? parseFloat(fxData.rate) : 0;
  const fxRateDate = fxData?.date ?? "";

  // ── Handlers ───────────────────────────────────────────────────────────

  function handleAddItem(product: ProductRead) {
    addItem(product);
  }

  async function handleCharge(payments: PendingPayment[]) {
    if (!session || items.length === 0) return;
    setCharging(true);
    try {
      const salePayloads = payments.map((p) => ({
        method: p.method,
        amount_mxn: p.amount_mxn,
        ...(p.amount_usd && { amount_usd: p.amount_usd }),
        ...(p.terminal_reference && {
          terminal_reference: p.terminal_reference,
        }),
      }));

      const saleItems = items.map((i) => ({
        product_id: i.product_id,
        quantity: String(i.quantity),
        unit_price_mxn: i.unit_price_mxn,
        discount_mxn: new Decimal(i.discount_mxn).greaterThan(0)
          ? i.discount_mxn
          : undefined,
      }));

      // Cast through unknown: types/index.ts SaleCreate is the authoritative
      // schema; api.ts has an older draft with different field names.
      const sale = await salesApi.create(token, {
        customer_id: customer_id ?? undefined,
        items: saleItems,
        payments: salePayloads,
        notes: notes || undefined,
      } as unknown as Parameters<typeof salesApi.create>[1]);

      // Invalidate product cache so stock counts refresh
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });

      clearCart();
      setCompletedSale(sale);
    } finally {
      setCharging(false);
    }
  }

  function handleNewSale() {
    setCompletedSale(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (sessionLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" label="Cargando terminal…" />
      </div>
    );
  }

  return (
    <>
      {/* Open session modal */}
      {!session && (
        <OpenSessionModal
          token={token}
          onSessionOpened={(s) => setSession(s)}
        />
      )}

      {/* Receipt modal */}
      {completedSale && (
        <ReceiptModal sale={completedSale} onNewSale={handleNewSale} />
      )}

      {/* 3-column POS layout */}
      <div className="flex h-full overflow-hidden">
        {/* Column 1 — Product grid (40%) */}
        <section
          className="flex flex-col border-r border-[var(--border)] p-3"
          style={{ width: "40%", minWidth: 0 }}
        >
          <ProductGrid token={token} onAddItem={handleAddItem} />
        </section>

        {/* Column 2 — Cart (30%) */}
        <section
          className="flex flex-col border-r border-[var(--border)]"
          style={{ width: "30%", minWidth: 0 }}
        >
          {user && <Cart token={token} user={user} fxRate={fxRate} />}
        </section>

        {/* Column 3 — Payment panel (30%) */}
        <section
          className="flex flex-col"
          style={{ width: "30%", minWidth: 0 }}
        >
          <PaymentPanel
            token={token}
            totalMxn={total_mxn}
            fxRate={fxRate}
            fxRateDate={fxRateDate}
            onCharge={handleCharge}
            charging={charging}
          />
        </section>
      </div>
    </>
  );
}
