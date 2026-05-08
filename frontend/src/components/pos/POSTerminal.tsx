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
import { CloseSessionModal } from "./CloseSessionModal";
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
  const [showCloseSession, setShowCloseSession] = useState(false);

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
      // Map frontend payment shape → backend PaymentCreate
      // Frontend uses cash_mxn/cash_usd; backend uses method + currency + amount
      const TIER_MAP: Record<number, string> = {
        1: "general",
        2: "a",
        3: "b",
        4: "c",
      };

      const salePayloads = payments.map((p) => {
        let method = p.method;
        let currency = "MXN";
        let amount = p.amount_mxn;

        if (p.method === "cash_mxn") {
          method = "cash";
          currency = "MXN";
        } else if (p.method === "cash_usd") {
          method = "cash";
          currency = "USD";
          amount = p.amount_usd ?? p.amount_mxn;
        }

        return {
          method,
          currency,
          amount,
          ...(p.terminal_reference && {
            terminal_reference: p.terminal_reference,
          }),
        };
      });

      const saleItems = items.map((i) => ({
        product_id: i.product_id,
        quantity: String(i.quantity),
        price_tier: TIER_MAP[i.price_tier] ?? "general",
        ...(new Decimal(i.discount_mxn).greaterThan(0) && {
          discount_mxn: i.discount_mxn,
        }),
      }));

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

  function handleSessionClosed() {
    setSession(null);
    setShowCloseSession(false);
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

      {/* Close session modal */}
      {showCloseSession && session && (
        <CloseSessionModal
          token={token}
          session={session}
          onSessionClosed={handleSessionClosed}
          onCancel={() => setShowCloseSession(false)}
        />
      )}

      {/* 2-column POS layout */}
      <div className="flex h-full w-full overflow-hidden">
        {/* Left — Product grid (55%) */}
        <section
          className="flex flex-col border-r border-[var(--border)] p-3"
          style={{ width: "55%", minWidth: 0 }}
        >
          {/* Session toolbar */}
          {session && (
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCloseSession(true)}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--error)] hover:text-[var(--error)]"
              >
                <span>⬛</span>
                Cerrar caja
              </button>
            </div>
          )}
          <ProductGrid token={token} onAddItem={handleAddItem} />
        </section>

        {/* Right — Cart (top) + Payment (bottom), stacked vertically (45%) */}
        <section
          className="flex flex-col"
          style={{ width: "45%", minWidth: 0 }}
        >
          {/* Cart — upper portion */}
          <div
            className="overflow-hidden border-b border-[var(--border)]"
            style={{ flex: "0 0 38%" }}
          >
            {user && <Cart token={token} user={user} fxRate={fxRate} />}
          </div>

          {/* Payment panel — lower portion */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <PaymentPanel
              token={token}
              totalMxn={total_mxn}
              fxRate={fxRate}
              fxRateDate={fxRateDate}
              onCharge={handleCharge}
              charging={charging}
            />
          </div>
        </section>
      </div>
    </>
  );
}
