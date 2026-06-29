"use client";

import { useState } from "react";
import { Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Modal, ModalContent } from "@heroui/react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { formatMXN } from "@/lib/currency";
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
  const [result, setResult] = useState<CashierSessionRead | null>(null);

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
      // Show the variance (over/short) before dismissing — the audit moment.
      const closed = await salesApi.closeSession(token, amount.toFixed(2));
      setResult(closed);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error.generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen
      hideCloseButton
      isDismissable={true}
      onClose={onCancel}
      size="sm"
      classNames={{
        backdrop: "bg-black/60 backdrop-blur-sm",
        base: "rounded-xl border border-[var(--border)] bg-[var(--bg-card)]",
      }}
      aria-labelledby="close-session-title"
    >
      <ModalContent>
        {() =>
          result ? (
            <ClosedResult result={result} onDone={onSessionClosed} />
          ) : (
            <div className="p-6">
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
          )
        }
      </ModalContent>
    </Modal>
  );
}

/** Post-close summary: shows expected vs physical and the over/short variance. */
function ClosedResult({
  result,
  onDone,
}: {
  result: CashierSessionRead;
  onDone: () => void;
}) {
  const expected = Number(result.expected_cash_mxn ?? 0);
  const physical = Number(result.physical_cash_mxn ?? 0);
  const diff =
    result.cash_difference_mxn !== undefined
      ? Number(result.cash_difference_mxn)
      : physical - expected;
  const balanced = Math.abs(diff) < 0.005;
  const ok = balanced || diff > 0; // cuadró o sobrante → olivo; faltante → tinto

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            ok ? "bg-[var(--success-subtle)]" : "bg-[var(--error-subtle)]",
          )}
        >
          {ok ? (
            <CheckCircle2 size={20} className="text-[var(--success)]" />
          ) : (
            <AlertTriangle size={20} className="text-[var(--error)]" />
          )}
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {t.sales.session_closed}
        </h2>
      </div>

      <div className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3 text-sm">
        <div className="flex justify-between text-[var(--text-secondary)]">
          <span>{t.sales.expected_cash}</span>
          <span className="font-medium tabular-nums text-[var(--text-primary)]">
            {formatMXN(expected.toFixed(2))}
          </span>
        </div>
        <div className="mt-1 flex justify-between text-[var(--text-secondary)]">
          <span>{t.sales.physical_cash}</span>
          <span className="font-medium tabular-nums text-[var(--text-primary)]">
            {formatMXN(physical.toFixed(2))}
          </span>
        </div>
      </div>

      <div
        className={cn(
          "mb-5 flex items-baseline justify-between rounded-lg px-4 py-3",
          ok ? "bg-[var(--success-subtle)]" : "bg-[var(--error-subtle)]",
        )}
      >
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          {balanced
            ? t.sales.balanced
            : diff > 0
              ? t.sales.surplus
              : t.sales.shortage}
        </span>
        <span
          className={cn(
            "text-2xl font-bold tabular-nums",
            ok ? "text-[var(--success)]" : "text-[var(--error)]",
          )}
        >
          {formatMXN(Math.abs(diff).toFixed(2))}
        </span>
      </div>

      <button
        type="button"
        onClick={onDone}
        autoFocus
        className={cn(
          "w-full rounded-lg py-2.5 text-sm font-semibold text-white transition",
          "bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.96]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
        )}
      >
        {t.action.finish}
      </button>
    </div>
  );
}
