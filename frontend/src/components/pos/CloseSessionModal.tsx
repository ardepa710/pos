"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { salesApi } from "@/lib/api";
import type { CashierSessionRead } from "@/types/index";
import { LoadingSpinner } from "@/components/ui";

interface CloseSessionModalProps {
  token: string;
  session: CashierSessionRead;
  onSessionClosed: () => void;
  onCancel: () => void;
}

export function CloseSessionModal({
  token,
  session,
  onSessionClosed,
  onCancel,
}: CloseSessionModalProps) {
  const [physicalCash, setPhysicalCash] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(physicalCash || "0");
    if (isNaN(amount) || amount < 0) {
      setError("Ingresa un monto válido");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await salesApi.closeSession(token, amount.toFixed(2));
      onSessionClosed();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error.generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      aria-labelledby="close-session-title"
    >
      <div
        className={cn(
          "w-full max-w-sm rounded-xl border border-[var(--border)]",
          "bg-[var(--bg-card)] shadow-[var(--shadow-modal)]",
          "p-6",
        )}
      >
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--error-subtle)]">
            <Lock size={20} className="text-[var(--error)]" />
          </div>
          <div>
            <h2
              id="close-session-title"
              className="text-lg font-semibold text-[var(--text-primary)]"
            >
              {t.sales.close_session}
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Ingresa el efectivo físico en caja al cierre
            </p>
          </div>
        </div>

        {/* Session summary */}
        <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3 text-sm">
          <div className="flex justify-between text-[var(--text-secondary)]">
            <span>Efectivo inicial</span>
            <span className="font-medium text-[var(--text-primary)]">
              ${Number(session.starting_cash_mxn ?? 0).toFixed(2)}
            </span>
          </div>
          <div className="mt-1 flex justify-between text-[var(--text-secondary)]">
            <span>Total ventas</span>
            <span className="font-medium text-[var(--text-primary)]">
              ${Number(session.total_sales_mxn ?? 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="physical-cash"
              className="text-sm font-medium text-[var(--text-secondary)]"
            >
              {t.sales.physical_cash}{" "}
              <span className="text-[var(--text-muted)]">(MXN)</span>
            </label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 text-sm text-[var(--text-muted)]">
                $
              </span>
              <input
                id="physical-cash"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={physicalCash}
                onChange={(e) => setPhysicalCash(e.target.value)}
                autoFocus
                className={cn(
                  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)]",
                  "py-2.5 pr-3 pl-7 text-right text-lg font-semibold text-[var(--text-primary)]",
                  "outline-none transition-colors focus:border-[var(--border-focus)]",
                  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                )}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-[var(--error-subtle)] px-3 py-2 text-sm text-[var(--error)]">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className={cn(
                "flex-1 rounded-lg border border-[var(--border)] py-2.5 text-sm font-medium",
                "text-[var(--text-secondary)] transition hover:bg-[var(--bg-input)] active:scale-[0.96]",
                "disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
              )}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold",
                "bg-[var(--error)] text-white transition hover:opacity-90 active:scale-[0.96]",
                "disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
              )}
            >
              {loading ? (
                <LoadingSpinner size="sm" label="Cerrando…" />
              ) : (
                t.sales.close_session
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
