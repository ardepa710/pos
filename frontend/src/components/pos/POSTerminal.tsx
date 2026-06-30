"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import Decimal from "decimal.js";
import { XCircle, ArrowRightLeft } from "lucide-react";
import { salesApi } from "@/lib/api";
import { formatMXN } from "@/lib/currency";
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

      {/* Resizable POS layout — drag the dividers; sizes persist per browser */}
      <PanelGroup
        direction="horizontal"
        autoSaveId="pos-terminal-h"
        className="h-full w-full"
      >
        {/* Left — Product grid */}
        <Panel defaultSize={55} minSize={35} className="flex flex-col">
          <section className="flex h-full flex-col p-3 min-w-0">
            {/* Session toolbar */}
            {session && (
              <div className="mb-2 flex items-center gap-3">
                {fxRate > 0 && (
                  <div className="flex items-center gap-1.5">
                    <ArrowRightLeft
                      size={12}
                      className="text-[var(--text-muted)]"
                    />
                    <span className="text-xs text-[var(--text-muted)]">
                      1 USD = {formatMXN(fxRate)} MXN
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {fxRateDate}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowCloseSession(true)}
                  className="ml-auto flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--error)] hover:text-[var(--error)]"
                >
                  <XCircle size={14} />
                  Cerrar caja
                </button>
              </div>
            )}
            <ProductGrid token={token} onAddItem={handleAddItem} />
          </section>
        </Panel>

        {/* Draggable vertical divider (catalog ↔ cart/payment) */}
        <PanelResizeHandle className="pos-resize-handle-v" />

        {/* Right — Cart (top) + Payment (bottom), themselves resizable */}
        <Panel defaultSize={45} minSize={28} className="min-w-0">
          <PanelGroup
            direction="vertical"
            autoSaveId="pos-terminal-v"
            className="h-full"
          >
            {/* Cart — upper portion */}
            <Panel defaultSize={38} minSize={18} className="overflow-hidden">
              <div className="h-full overflow-hidden">
                {user && <Cart token={token} user={user} fxRate={fxRate} />}
              </div>
            </Panel>

            {/* Draggable horizontal divider (cart ↔ payment) */}
            <PanelResizeHandle className="pos-resize-handle-h" />

            {/* Payment panel — lower portion */}
            <Panel defaultSize={62} minSize={25} className="overflow-hidden">
              <div className="h-full overflow-hidden">
                <PaymentPanel
                  token={token}
                  totalMxn={total_mxn}
                  fxRate={fxRate}
                  fxRateDate={fxRateDate}
                  onCharge={handleCharge}
                  charging={charging}
                />
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </>
  );
}
