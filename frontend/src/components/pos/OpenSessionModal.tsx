"use client";

import { useState } from "react";
import { DollarSign } from "lucide-react";
import { Modal, ModalContent } from "@heroui/react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { salesApi } from "@/lib/api";
import type { CashierSessionRead } from "@/types/index";
import { LoadingSpinner } from "@/components/ui";

interface OpenSessionModalProps {
  token: string;
  onSessionOpened: (session: CashierSessionRead) => void;
}

export function OpenSessionModal({
  token,
  onSessionOpened,
}: OpenSessionModalProps) {
  const [startingCash, setStartingCash] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(startingCash || "0");
    if (isNaN(amount) || amount < 0) {
      setError("Ingresa un monto válido");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const session = await salesApi.openSession(token, amount.toFixed(2));
      onSessionOpened(session);
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
      isDismissable={false}
      size="sm"
      classNames={{
        backdrop: "bg-black/60 backdrop-blur-sm",
        base: "rounded-xl border border-[var(--border)] bg-[var(--bg-card)]",
      }}
      aria-labelledby="open-session-title"
    >
      <ModalContent>
        {() => (
          <div className="p-6">
            {/* Header */}
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-subtle)]">
                <DollarSign size={20} className="text-[var(--accent)]" />
              </div>
              <div>
                <h2
                  id="open-session-title"
                  className="text-lg font-semibold text-[var(--text-primary)]"
                >
                  {t.sales.open_session}
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Ingresa el efectivo inicial en caja
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="starting-cash"
                  className="text-sm font-medium text-[var(--text-secondary)]"
                >
                  {t.sales.starting_cash}{" "}
                  <span className="text-[var(--text-muted)]">(MXN)</span>
                </label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3 text-sm text-[var(--text-muted)]">
                    $
                  </span>
                  <input
                    id="starting-cash"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={startingCash}
                    onChange={(e) => setStartingCash(e.target.value)}
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

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold",
                  "bg-[var(--accent)] text-white transition hover:bg-[var(--accent-hover)] active:scale-[0.96]",
                  "disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
                )}
              >
                {loading ? (
                  <LoadingSpinner size="sm" label="Abriendo caja…" />
                ) : (
                  t.sales.open_session
                )}
              </button>
            </form>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
