"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { FormField, StatusBadge, CurrencyDisplay } from "@/components/ui";
import { giftCardsApi } from "@/lib/api";
import type { GiftCardRead } from "@/types/index";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";

interface RedeemGiftCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRedeemed: (card: GiftCardRead) => void;
  /** Pre-fill the code field from a lookup */
  prefillCode?: string;
  /** If already fetched from lookup, pass the card directly */
  prefillCard?: GiftCardRead | null;
}

export function RedeemGiftCardModal({
  isOpen,
  onClose,
  onRedeemed,
  prefillCode = "",
  prefillCard = null,
}: RedeemGiftCardModalProps) {
  const { token } = useAuth();

  const [code, setCode] = useState(prefillCode);
  const [card, setCard] = useState<GiftCardRead | null>(prefillCard);
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");
  const [apiError, setApiError] = useState("");
  const [isLooking, setIsLooking] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [success, setSuccess] = useState(false);

  // Sync prefill values when modal opens
  useEffect(() => {
    if (isOpen) {
      setCode(prefillCode);
      setCard(prefillCard);
      setAmount("");
      setAmountError("");
      setApiError("");
      setSuccess(false);
    }
  }, [isOpen, prefillCode, prefillCard]);

  function handleClose() {
    setCode("");
    setCard(null);
    setAmount("");
    setAmountError("");
    setApiError("");
    setSuccess(false);
    onClose();
  }

  async function handleLookup() {
    if (!code.trim()) return;
    setIsLooking(true);
    setApiError("");
    setCard(null);
    try {
      const result = await giftCardsApi.lookup(token, code.trim());
      setCard(result);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : t.error.generic);
    } finally {
      setIsLooking(false);
    }
  }

  function validate(): boolean {
    const val = parseFloat(amount);
    if (!amount || isNaN(val) || val <= 0) {
      setAmountError("El monto debe ser mayor a 0");
      return false;
    }
    if (card && val > parseFloat(card.current_balance)) {
      setAmountError(`Máximo disponible: ${card.current_balance}`);
      return false;
    }
    setAmountError("");
    return true;
  }

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!card || !validate()) return;
    setIsRedeeming(true);
    setApiError("");
    try {
      const updated = await giftCardsApi.redeem(token, card.code, amount);
      setSuccess(true);
      onRedeemed(updated);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : t.error.generic);
    } finally {
      setIsRedeeming(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:outline-none transition-colors";

  const isCardUsable =
    card && card.status === "active" && parseFloat(card.current_balance) > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      isDismissable={!isRedeeming}
      classNames={{
        base: "bg-[var(--bg-card)] border border-[var(--border)]",
        header: "text-[var(--text-primary)] border-b border-[var(--border)]",
        body: "text-[var(--text-secondary)]",
        footer: "border-t border-[var(--border)]",
      }}
    >
      <ModalContent>
        <ModalHeader>{t.gift_cards.redeem}</ModalHeader>

        {success ? (
          <>
            <ModalBody>
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="text-4xl">✅</div>
                <p className="font-medium text-[var(--text-primary)]">
                  Canje realizado correctamente
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  Código:{" "}
                  <span className="font-mono font-bold">{card?.code}</span>
                </p>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                onPress={handleClose}
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white border-0"
              >
                {t.action.close}
              </Button>
            </ModalFooter>
          </>
        ) : (
          <form onSubmit={handleRedeem}>
            <ModalBody>
              <div className="flex flex-col gap-4">
                {apiError && (
                  <p className="rounded-lg border border-[var(--error)] px-3 py-2 text-sm text-[var(--error)]">
                    {apiError}
                  </p>
                )}

                {/* Code lookup */}
                <FormField label={t.gift_cards.code} required>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ingresa el código"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value);
                        setCard(null);
                      }}
                      className={inputClass}
                      autoFocus={!prefillCode}
                    />
                    <button
                      type="button"
                      onClick={handleLookup}
                      disabled={isLooking || !code.trim()}
                      className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--bg-card-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--accent-subtle)] disabled:opacity-40 transition-colors"
                    >
                      {isLooking ? t.action.loading : t.action.search}
                    </button>
                  </div>
                </FormField>

                {/* Card details */}
                {card && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card-elevated)] p-4">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <span className="text-[var(--text-muted)]">
                        {t.gift_cards.current_balance}
                      </span>
                      <span className="text-right font-semibold text-[var(--text-primary)]">
                        <CurrencyDisplay
                          amount={card.current_balance}
                          currency={card.currency as "MXN" | "USD"}
                        />
                      </span>

                      <span className="text-[var(--text-muted)]">
                        {t.gift_cards.status}
                      </span>
                      <span className="text-right">
                        <StatusBadge status={card.status} size="sm" />
                      </span>

                      {card.expires_at && (
                        <>
                          <span className="text-[var(--text-muted)]">
                            {t.gift_cards.expires}
                          </span>
                          <span className="text-right text-[var(--text-primary)]">
                            {new Date(card.expires_at).toLocaleDateString(
                              "es-MX",
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Amount input — only when card is usable */}
                {isCardUsable && (
                  <FormField
                    label="Monto a canjear"
                    required
                    error={amountError}
                  >
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={card!.current_balance}
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setAmountError("");
                      }}
                      className={inputClass}
                      autoFocus
                    />
                  </FormField>
                )}

                {card && !isCardUsable && (
                  <p className="text-sm text-[var(--warning)]">
                    Esta tarjeta no está disponible para canje (estado:{" "}
                    {card.status}).
                  </p>
                )}
              </div>
            </ModalBody>

            <ModalFooter>
              <Button
                type="button"
                variant="bordered"
                onPress={handleClose}
                isDisabled={isRedeeming}
                className="border-[var(--border)] text-[var(--text-secondary)]"
              >
                {t.action.cancel}
              </Button>
              <Button
                type="submit"
                isLoading={isRedeeming}
                isDisabled={isRedeeming || !isCardUsable || !amount}
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white border-0 font-medium"
              >
                {t.gift_cards.redeem}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
