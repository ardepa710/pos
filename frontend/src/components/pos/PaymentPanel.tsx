"use client";

import { useState } from "react";
import {
  Banknote,
  CreditCard,
  Gift,
  Star,
  ArrowRightLeft,
  Plus,
  X,
  AlertCircle,
} from "lucide-react";
import Decimal from "decimal.js";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { formatMXN, formatUSD, usdToMxn, mxnToUsd } from "@/lib/currency";
import { giftCardsApi } from "@/lib/api";
import { LoadingSpinner } from "@/components/ui";
import type { PaymentMethod } from "@/types/index";

// ── Types ────────────────────────────────────────────────────────────────────

interface PendingPayment {
  id: string; // local uuid for list key
  method: PaymentMethod;
  amount_mxn: string;
  amount_usd?: string;
  terminal_reference?: string;
}

interface PaymentPanelProps {
  token: string;
  totalMxn: string;
  fxRate: number;
  fxRateDate: string;
  onCharge: (payments: PendingPayment[]) => Promise<void>;
  charging: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

interface MethodMeta {
  key: PaymentMethod;
  label: string;
  icon: React.ReactNode;
  needsTerminal?: boolean;
  isUsd?: boolean;
  isGiftCard?: boolean;
  isLoyalty?: boolean;
}

const METHODS: MethodMeta[] = [
  {
    key: "cash_mxn",
    label: t.payment.cash_mxn,
    icon: <Banknote size={15} />,
  },
  {
    key: "cash_usd",
    label: t.payment.cash_usd,
    icon: <Banknote size={15} />,
    isUsd: true,
  },
  {
    key: "credit_card",
    label: t.payment.credit_card,
    icon: <CreditCard size={15} />,
    needsTerminal: true,
  },
  {
    key: "debit_card",
    label: t.payment.debit_card,
    icon: <CreditCard size={15} />,
    needsTerminal: true,
  },
  {
    key: "gift_card",
    label: t.payment.gift_card,
    icon: <Gift size={15} />,
    isGiftCard: true,
  },
  {
    key: "loyalty_points",
    label: t.payment.loyalty_points,
    icon: <Star size={15} />,
    isLoyalty: true,
  },
  {
    key: "transfer",
    label: t.payment.transfer,
    icon: <ArrowRightLeft size={15} />,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ── Component ────────────────────────────────────────────────────────────────

export function PaymentPanel({
  token,
  totalMxn,
  fxRate,
  fxRateDate,
  onCharge,
  charging,
}: PaymentPanelProps) {
  const [selectedMethod, setSelectedMethod] =
    useState<PaymentMethod>("cash_mxn");
  const [amountInput, setAmountInput] = useState("");
  const [terminalRef, setTerminalRef] = useState("");
  const [giftCode, setGiftCode] = useState("");
  const [giftLookupLoading, setGiftLookupLoading] = useState(false);
  const [giftBalance, setGiftBalance] = useState<string | null>(null);
  const [giftError, setGiftError] = useState<string | null>(null);
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [chargeError, setChargeError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

  const meta = METHODS.find((m) => m.key === selectedMethod)!;

  // ── Computed ────────────────────────────────────────────────────────────

  const totalDec = new Decimal(totalMxn || "0");

  const paidDec = payments.reduce(
    (acc, p) => acc.add(new Decimal(p.amount_mxn)),
    new Decimal(0),
  );

  const remainingDec = totalDec.sub(paidDec);
  const remainingMxn = remainingDec.lessThan(0)
    ? "0.00"
    : remainingDec.toFixed(2);
  const changeDec = paidDec.sub(totalDec);
  const changeMxn = changeDec.greaterThan(0) ? changeDec.toFixed(2) : null;
  const canCharge =
    paidDec.greaterThanOrEqualTo(totalDec) && payments.length > 0;

  // Resolved MXN amount from current input
  function resolveAmountMxn(): string {
    const raw = parseFloat(amountInput || "0");
    if (meta.isUsd && fxRate > 0) {
      return usdToMxn(raw, fxRate).toFixed(2);
    }
    return isNaN(raw) ? "0.00" : raw.toFixed(2);
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleMethodSelect(method: PaymentMethod) {
    setSelectedMethod(method);
    setAmountInput("");
    setTerminalRef("");
    setGiftCode("");
    setGiftBalance(null);
    setGiftError(null);
  }

  async function handleGiftLookup() {
    if (!giftCode.trim()) return;
    setGiftLookupLoading(true);
    setGiftError(null);
    setGiftBalance(null);
    try {
      const card = await giftCardsApi.lookup(token, giftCode.trim());
      if (card.status !== "active") {
        setGiftError("Tarjeta no activa o ya canjeada");
        return;
      }
      setGiftBalance(card.current_balance);
      // Pre-fill amount with min(balance, remaining)
      const balDec = new Decimal(card.current_balance);
      const remDec = new Decimal(remainingMxn);
      setAmountInput(Decimal.min(balDec, remDec).toFixed(2));
    } catch {
      setGiftError("Tarjeta no encontrada");
    } finally {
      setGiftLookupLoading(false);
    }
  }

  function handleAddPayment() {
    const amountMxn = resolveAmountMxn();
    if (new Decimal(amountMxn).lessThanOrEqualTo(0)) return;

    // Validation: terminal reference required for card payments
    if (meta.needsTerminal && !terminalRef.trim()) return;

    // Validation: gift card needs lookup first
    if (meta.isGiftCard && !giftBalance) return;

    const payment: PendingPayment = {
      id: uid(),
      method: selectedMethod,
      amount_mxn: amountMxn,
      ...(meta.isUsd && {
        amount_usd: parseFloat(amountInput || "0").toFixed(2),
      }),
      ...(meta.needsTerminal &&
        terminalRef && {
          terminal_reference: terminalRef.trim(),
        }),
      ...(meta.isGiftCard &&
        giftCode && {
          terminal_reference: giftCode.trim(),
        }),
    };

    setPayments((prev) => [...prev, payment]);
    setAmountInput("");
    setTerminalRef("");
    setGiftCode("");
    setGiftBalance(null);
    setGiftError(null);
    setChargeError(null);
  }

  function handleRemovePayment(id: string) {
    setPayments((prev) => prev.filter((p) => p.id !== id));
    setChargeError(null);
  }

  function startEditPayment(p: PendingPayment) {
    const isUsd = p.method === "cash_usd";
    setEditingId(p.id);
    setEditVal(isUsd && p.amount_usd ? p.amount_usd : p.amount_mxn);
  }

  function commitEditPayment(p: PendingPayment) {
    const raw = parseFloat(editVal || "0");
    if (isNaN(raw) || raw <= 0) {
      setEditingId(null);
      return;
    }
    const isUsd = p.method === "cash_usd";
    const newMxn =
      isUsd && fxRate > 0 ? usdToMxn(raw, fxRate).toFixed(2) : raw.toFixed(2);
    setPayments((prev) =>
      prev.map((pp) =>
        pp.id === p.id
          ? {
              ...pp,
              amount_mxn: newMxn,
              ...(isUsd ? { amount_usd: raw.toFixed(2) } : {}),
            }
          : pp,
      ),
    );
    setEditingId(null);
    setChargeError(null);
  }

  async function handleCharge() {
    if (!canCharge) return;
    setChargeError(null);
    try {
      await onCharge(payments);
      // Reset on success
      setPayments([]);
      setAmountInput("");
    } catch (err) {
      setChargeError(err instanceof Error ? err.message : t.error.generic);
    }
  }

  // Shortcut: fill remaining amount
  function fillRemaining() {
    if (meta.isUsd && fxRate > 0) {
      // Round UP so the USD equivalent always covers the full MXN balance
      const usdCeil = new Decimal(remainingMxn)
        .div(new Decimal(fxRate))
        .toDecimalPlaces(2, Decimal.ROUND_CEIL)
        .toFixed(2);
      setAmountInput(usdCeil);
    } else {
      setAmountInput(remainingMxn);
    }
  }

  const methodLabel = (method: PaymentMethod) =>
    METHODS.find((m) => m.key === method)?.label ?? method;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: "var(--payment-panel-bg)" }}
    >
      {/* Total */}
      <div className="border-b border-[var(--border)] px-4 py-3 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          {t.payment.total}
        </p>
        <p className="mt-0.5 text-3xl font-bold tabular-nums text-[var(--text-primary)]">
          {formatMXN(totalMxn)}
        </p>
        {fxRate > 0 && (
          <p className="mt-0.5 text-sm tabular-nums text-[var(--text-muted)]">
            {formatUSD(mxnToUsd(parseFloat(totalMxn), fxRate))} USD
          </p>
        )}
      </div>

      {/* Scrollable body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {/* Method selector */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {t.payment.method}
        </p>
        <div className="mb-4 grid grid-cols-2 gap-1.5">
          {METHODS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => handleMethodSelect(m.key)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium",
                "transition-colors",
                selectedMethod === m.key
                  ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
              )}
            >
              {m.icon}
              <span className="truncate">{m.label}</span>
            </button>
          ))}
        </div>

        {/* Amount input area */}
        <div className="mb-3 flex flex-col gap-2">
          {/* Gift card code + lookup */}
          {meta.isGiftCard && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Código de tarjeta"
                value={giftCode}
                onChange={(e) => {
                  setGiftCode(e.target.value);
                  setGiftBalance(null);
                  setGiftError(null);
                }}
                className={cn(
                  "flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-input)]",
                  "px-3 py-2 text-sm text-[var(--text-primary)] outline-none",
                  "focus:border-[var(--border-focus)]",
                )}
              />
              <button
                type="button"
                onClick={handleGiftLookup}
                disabled={!giftCode.trim() || giftLookupLoading}
                className={cn(
                  "rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2",
                  "text-xs font-medium text-[var(--text-secondary)]",
                  "transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {giftLookupLoading ? <LoadingSpinner size="sm" /> : "Verificar"}
              </button>
            </div>
          )}

          {/* Gift balance info */}
          {giftBalance !== null && (
            <p className="text-xs text-[var(--success)]">
              Saldo disponible: {formatMXN(giftBalance)}
            </p>
          )}
          {giftError && (
            <p className="text-xs text-[var(--error)]">{giftError}</p>
          )}

          {/* Terminal reference */}
          {meta.needsTerminal && (
            <input
              type="text"
              placeholder={t.payment.terminal_reference_placeholder}
              value={terminalRef}
              onChange={(e) => setTerminalRef(e.target.value)}
              className={cn(
                "rounded-lg border border-[var(--border)] bg-[var(--bg-input)]",
                "px-3 py-2 text-sm text-[var(--text-primary)] outline-none",
                "focus:border-[var(--border-focus)]",
                !terminalRef.trim() && "border-[var(--warning)]",
              )}
            />
          )}
          {meta.needsTerminal && !terminalRef.trim() && (
            <p className="text-[11px] text-[var(--warning)]">
              {t.payment.terminal_reference_required}
            </p>
          )}

          {/* Amount input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">
                {meta.isUsd ? "USD" : "$"}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className={cn(
                  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)]",
                  "py-2 pr-3 pl-12 text-right text-sm font-semibold text-[var(--text-primary)]",
                  "outline-none focus:border-[var(--border-focus)]",
                  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                )}
              />
            </div>
            {/* Fill remaining shortcut */}
            {parseFloat(remainingMxn) > 0 && (
              <button
                type="button"
                onClick={fillRemaining}
                className={cn(
                  "flex-shrink-0 rounded-lg border border-[var(--border)] bg-[var(--bg-card)]",
                  "px-2.5 py-2 text-xs font-medium text-[var(--text-secondary)]",
                  "transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]",
                )}
                title="Llenar con el restante"
                aria-label="Llenar con el monto restante"
              >
                Exacto
              </button>
            )}
          </div>

          {/* USD → MXN conversion hint */}
          {meta.isUsd &&
            amountInput &&
            parseFloat(amountInput) > 0 &&
            fxRate > 0 && (
              <p className="text-right text-xs text-[var(--text-muted)]">
                = {formatMXN(usdToMxn(parseFloat(amountInput), fxRate))} MXN
              </p>
            )}

          {/* Add payment button */}
          <button
            type="button"
            onClick={handleAddPayment}
            disabled={
              !amountInput ||
              parseFloat(amountInput) <= 0 ||
              (meta.needsTerminal && !terminalRef.trim()) ||
              (meta.isGiftCard && !giftBalance)
            }
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg py-2",
              "border border-dashed border-[var(--accent)] text-sm font-medium text-[var(--accent)]",
              "transition-colors hover:bg-[var(--accent-subtle)]",
              "disabled:cursor-not-allowed disabled:border-[var(--border)] disabled:text-[var(--text-muted)]",
            )}
          >
            <Plus size={15} />
            Agregar pago
          </button>
        </div>

        {/* Added payments list */}
        {payments.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Pagos agregados
            </p>
            <div className="flex flex-col gap-1">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-[var(--text-primary)]">
                      {methodLabel(p.method)}
                    </span>
                    {p.terminal_reference && (
                      <span className="text-[10px] text-[var(--text-muted)]">
                        Ref: {p.terminal_reference}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId === p.id ? (
                      <input
                        autoFocus
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        onBlur={() => commitEditPayment(p)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEditPayment(p);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="w-20 rounded border border-[var(--border-focus)] bg-[var(--bg-input)] px-2 py-0.5 text-right text-sm font-semibold tabular-nums text-[var(--text-primary)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    ) : (
                      <button
                        type="button"
                        title="Editar monto"
                        onClick={() => startEditPayment(p)}
                        className="tabular-nums text-sm font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]"
                      >
                        {p.method === "cash_usd" && p.amount_usd
                          ? formatUSD(p.amount_usd)
                          : formatMXN(p.amount_mxn)}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemovePayment(p.id)}
                      aria-label="Quitar pago"
                      className="text-[var(--text-muted)] transition-colors hover:text-[var(--error)]"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Remaining / change summary */}
        {payments.length > 0 && (
          <div className="mb-3 flex flex-col gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2">
            <div className="flex justify-between text-sm text-[var(--text-secondary)]">
              <span>{t.payment.paid}</span>
              <span className="tabular-nums font-medium">
                {formatMXN(paidDec.toFixed(2))}
              </span>
            </div>
            {changeMxn ? (
              <div className="flex justify-between text-sm font-semibold text-[var(--success)]">
                <span>{t.payment.change}</span>
                <span className="tabular-nums">{formatMXN(changeMxn)}</span>
              </div>
            ) : (
              <div className="flex justify-between text-sm text-[var(--warning)]">
                <span>{t.payment.remaining}</span>
                <span className="tabular-nums font-medium">
                  {formatMXN(remainingMxn)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Charge error */}
        {chargeError && (
          <div className="mb-3 flex items-start gap-2 rounded-lg bg-[var(--error-subtle)] px-3 py-2">
            <AlertCircle
              size={14}
              className="mt-0.5 flex-shrink-0 text-[var(--error)]"
            />
            <p className="text-xs text-[var(--error)]">{chargeError}</p>
          </div>
        )}
      </div>

      {/* Charge button / empty-state hint */}
      <div className="border-t border-[var(--border)] p-4">
        {payments.length === 0 ? (
          <p className="py-3 text-center text-sm text-[var(--text-muted)]">
            Agrega un método de pago para continuar
          </p>
        ) : (
          <button
            type="button"
            disabled={!canCharge || charging}
            onClick={handleCharge}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl py-3.5",
              "text-base font-bold text-white transition",
              canCharge && !charging
                ? "bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.96]"
                : "cursor-not-allowed bg-[var(--text-muted)]",
            )}
          >
            {charging ? (
              <LoadingSpinner size="sm" label="Procesando…" />
            ) : (
              <>
                <Banknote size={18} />
                Cobrar {formatMXN(totalMxn)}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
