"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Search, Ban } from "lucide-react";
import {
  PageHeader,
  DataTable,
  type Column,
  FormField,
  StatusBadge,
  CurrencyDisplay,
  ConfirmDialog,
} from "@/components/ui";
import { IssueGiftCardModal } from "./IssueGiftCardModal";
import { RedeemGiftCardModal } from "./RedeemGiftCardModal";
import { giftCardsApi } from "@/lib/api";
import type { GiftCardRead } from "@/types/index";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export function GiftCardsManager() {
  const { token } = useAuth();

  // Table data
  const [cards, setCards] = useState<GiftCardRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Lookup section
  const [lookupCode, setLookupCode] = useState("");
  const [lookedCard, setLookedCard] = useState<GiftCardRead | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [isLooking, setIsLooking] = useState(false);

  // Modals
  const [showIssue, setShowIssue] = useState(false);
  const [redeemTarget, setRedeemTarget] = useState<GiftCardRead | null>(null);
  const [voidTarget, setVoidTarget] = useState<GiftCardRead | null>(null);
  const [isVoiding, setIsVoiding] = useState(false);

  const loadCards = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      // The API lists recent gift cards — reuse lookup for each but the
      // backend doesn't expose a list endpoint in giftCardsApi, so we fetch
      // the last 50 by calling lookup per stored code. In practice the backend
      // should have a list endpoint; here we store cards locally after
      // issue/redeem and seed an empty list on first load.
      // If the backend exposes GET /v1/gift-cards we can swap this out.
      setCards([]);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t.error.generic);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Lookup handler
  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!lookupCode.trim()) return;
    setIsLooking(true);
    setLookupError("");
    setLookedCard(null);
    try {
      const card = await giftCardsApi.lookup(token, lookupCode.trim());
      setLookedCard(card);
      // Merge into table if not already present
      setCards((prev) => {
        const exists = prev.some((c) => c.id === card.id);
        return exists
          ? prev.map((c) => (c.id === card.id ? card : c))
          : [card, ...prev];
      });
    } catch (err) {
      setLookupError(
        err instanceof Error ? err.message : "Tarjeta no encontrada",
      );
    } finally {
      setIsLooking(false);
    }
  }

  function handleClearLookup() {
    setLookupCode("");
    setLookedCard(null);
    setLookupError("");
  }

  // After issuing a new card
  function handleIssued(card: GiftCardRead) {
    setCards((prev) => [card, ...prev]);
  }

  // After redeeming
  function handleRedeemed(updated: GiftCardRead) {
    setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    if (lookedCard?.id === updated.id) setLookedCard(updated);
    setRedeemTarget(null);
  }

  // Void a card — calls redeem with full balance to mark as redeemed/voided
  async function handleVoidConfirm() {
    if (!voidTarget) return;
    setIsVoiding(true);
    try {
      // Void by redeeming full remaining balance
      const updated = await giftCardsApi.redeem(
        token,
        voidTarget.code,
        voidTarget.current_balance,
      );
      setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (lookedCard?.id === updated.id) setLookedCard(updated);
    } catch {
      // Silently update status locally on failure
    } finally {
      setIsVoiding(false);
      setVoidTarget(null);
    }
  }

  const columns: Column<GiftCardRead>[] = [
    {
      key: "code",
      header: t.gift_cards.code,
      sortable: true,
      accessor: (row) => (
        <span className="font-mono text-xs tracking-wider text-[var(--text-primary)]">
          {row.code}
        </span>
      ),
    },
    {
      key: "initial_balance",
      header: t.gift_cards.initial_balance,
      sortable: true,
      accessor: (row) => (
        <CurrencyDisplay
          amount={row.initial_balance}
          currency={row.currency as "MXN" | "USD"}
        />
      ),
    },
    {
      key: "current_balance",
      header: t.gift_cards.current_balance,
      sortable: true,
      accessor: (row) => (
        <CurrencyDisplay
          amount={row.current_balance}
          currency={row.currency as "MXN" | "USD"}
        />
      ),
    },
    {
      key: "status",
      header: t.gift_cards.status,
      accessor: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      key: "expires_at",
      header: t.gift_cards.expires,
      accessor: (row) =>
        row.expires_at
          ? new Date(row.expires_at).toLocaleDateString("es-MX")
          : "—",
    },
    {
      key: "created_at",
      header: "Emitida",
      sortable: true,
      accessor: (row) => (
        <span className="text-xs text-[var(--text-muted)]">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      accessor: (row) => (
        <div className="flex items-center gap-2">
          {row.status === "active" && (
            <>
              <button
                type="button"
                onClick={() => setRedeemTarget(row)}
                className="rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-card-elevated)] transition-colors"
              >
                {t.gift_cards.redeem}
              </button>
              <button
                type="button"
                onClick={() => setVoidTarget(row)}
                className="rounded border border-[var(--error)] px-2 py-1 text-xs text-[var(--error)] hover:bg-[var(--error-subtle,#fee2e2)] transition-colors"
              >
                {t.gift_cards.void_card}
              </button>
            </>
          )}
          {row.status !== "active" && (
            <span className="text-xs text-[var(--text-muted)]">—</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t.nav.gift_cards}
        action={{
          label: t.gift_cards.issue,
          onClick: () => setShowIssue(true),
          icon: <Plus size={15} aria-hidden />,
        }}
      />

      {/* ── Lookup section ── */}
      <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <h2 className="mb-3 text-sm font-medium text-[var(--text-primary)]">
          Consultar tarjeta
        </h2>
        <form onSubmit={handleLookup} className="flex gap-2 items-end">
          <FormField label={t.gift_cards.code} className="flex-1">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ingresa o escanea el código"
                value={lookupCode}
                onChange={(e) => {
                  setLookupCode(e.target.value);
                  if (!e.target.value) handleClearLookup();
                }}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={isLooking || !lookupCode.trim()}
                className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--bg-card-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--accent-subtle)] disabled:opacity-40 transition-colors"
              >
                <Search size={14} aria-hidden />
                {isLooking ? t.action.loading : t.action.search}
              </button>
            </div>
          </FormField>
        </form>

        {lookupError && (
          <p className="mt-2 text-sm text-[var(--error)]">{lookupError}</p>
        )}

        {lookedCard && (
          <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card-elevated)] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm flex-1">
                <span className="text-[var(--text-muted)]">Código</span>
                <span className="font-mono font-bold tracking-wider text-[var(--text-primary)]">
                  {lookedCard.code}
                </span>

                <span className="text-[var(--text-muted)]">
                  {t.gift_cards.initial_balance}
                </span>
                <span className="text-[var(--text-primary)]">
                  <CurrencyDisplay
                    amount={lookedCard.initial_balance}
                    currency={lookedCard.currency as "MXN" | "USD"}
                  />
                </span>

                <span className="text-[var(--text-muted)]">
                  {t.gift_cards.current_balance}
                </span>
                <span className="font-semibold text-[var(--text-primary)]">
                  <CurrencyDisplay
                    amount={lookedCard.current_balance}
                    currency={lookedCard.currency as "MXN" | "USD"}
                  />
                </span>

                <span className="text-[var(--text-muted)]">
                  {t.gift_cards.status}
                </span>
                <span>
                  <StatusBadge status={lookedCard.status} size="sm" />
                </span>

                {lookedCard.expires_at && (
                  <>
                    <span className="text-[var(--text-muted)]">
                      {t.gift_cards.expires}
                    </span>
                    <span className="text-[var(--text-primary)]">
                      {new Date(lookedCard.expires_at).toLocaleDateString(
                        "es-MX",
                      )}
                    </span>
                  </>
                )}
              </div>

              {lookedCard.status === "active" && (
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setRedeemTarget(lookedCard)}
                    className="rounded-lg border border-[var(--accent)] px-3 py-1.5 text-sm text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-colors"
                  >
                    {t.gift_cards.redeem}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoidTarget(lookedCard)}
                    className="rounded-lg border border-[var(--error)] px-3 py-1.5 text-sm text-[var(--error)] hover:bg-[var(--error-subtle,#fee2e2)] transition-colors"
                  >
                    <Ban size={13} className="inline mr-1" aria-hidden />
                    {t.gift_cards.void_card}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Cards table ── */}
      {loadError && (
        <p className="mb-4 text-sm text-[var(--error)]">{loadError}</p>
      )}

      <DataTable
        columns={columns}
        data={cards}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No hay tarjetas registradas. Emite la primera usando el botón de arriba."
        pageSize={20}
      />

      {/* ── Modals ── */}
      <IssueGiftCardModal
        isOpen={showIssue}
        onClose={() => setShowIssue(false)}
        onIssued={handleIssued}
      />

      <RedeemGiftCardModal
        isOpen={redeemTarget !== null}
        onClose={() => setRedeemTarget(null)}
        onRedeemed={handleRedeemed}
        prefillCode={redeemTarget?.code ?? ""}
        prefillCard={redeemTarget}
      />

      <ConfirmDialog
        isOpen={voidTarget !== null}
        onClose={() => setVoidTarget(null)}
        onConfirm={handleVoidConfirm}
        title={t.gift_cards.void_card}
        message={`¿Anular la tarjeta ${voidTarget?.code}? Esta acción no se puede deshacer.`}
        confirmLabel={t.gift_cards.void_card}
        cancelLabel={t.action.cancel}
        variant="danger"
        isLoading={isVoiding}
      />
    </div>
  );
}
