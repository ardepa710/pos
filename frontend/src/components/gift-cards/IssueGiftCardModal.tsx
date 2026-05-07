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
import { Printer, X } from "lucide-react";
import QRCode from "qrcode";
import { FormField } from "@/components/ui";
import { giftCardsApi } from "@/lib/api";
import type { GiftCardRead } from "@/types/index";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { formatMXN } from "@/lib/currency";

interface IssueGiftCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIssued: (card: GiftCardRead) => void;
}

interface FormState {
  initial_balance: string;
  currency: "MXN" | "USD";
  expires_at: string;
}

const INITIAL_FORM: FormState = {
  initial_balance: "",
  currency: "MXN",
  expires_at: "",
};

export function IssueGiftCardModal({
  isOpen,
  onClose,
  onIssued,
}: IssueGiftCardModalProps) {
  const { token } = useAuth();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  // Success state — shows QR code
  const [issuedCard, setIssuedCard] = useState<GiftCardRead | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  // Generate QR when card is issued
  useEffect(() => {
    if (!issuedCard) return;
    QRCode.toDataURL(issuedCard.code, { width: 200, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [issuedCard]);

  function handleClose() {
    setForm(INITIAL_FORM);
    setErrors({});
    setApiError("");
    setIssuedCard(null);
    setQrDataUrl("");
    onClose();
  }

  function validate(): boolean {
    const next: Partial<FormState> = {};
    const balance = parseFloat(form.initial_balance);
    if (!form.initial_balance || isNaN(balance) || balance <= 0) {
      next.initial_balance = "El saldo debe ser mayor a 0";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setApiError("");
    try {
      const payload: {
        initial_balance: string;
        currency?: string;
        expires_at?: string;
      } = {
        initial_balance: form.initial_balance,
        currency: form.currency,
      };
      if (form.expires_at) payload.expires_at = form.expires_at;
      const card = await giftCardsApi.issue(token, payload);
      setIssuedCard(card);
      onIssued(card);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : t.error.generic);
    } finally {
      setIsLoading(false);
    }
  }

  function handlePrint() {
    const win = window.open("", "_blank", "width=400,height=500");
    if (!win || !issuedCard) return;
    win.document.write(`
      <html><head><title>Tarjeta Regalo</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 2rem; }
        h2 { margin-bottom: 0.5rem; }
        p { color: #555; font-size: 0.9rem; margin: 0.25rem 0; }
        .code { font-size: 1.2rem; font-weight: bold; letter-spacing: 0.1em; margin: 1rem 0; }
        img { display: block; margin: 1rem auto; }
      </style>
      </head><body>
      <h2>Tarjeta Regalo</h2>
      ${qrDataUrl ? `<img src="${qrDataUrl}" width="180" />` : ""}
      <div class="code">${issuedCard.code}</div>
      <p>Saldo inicial: ${formatMXN(parseFloat(issuedCard.initial_balance))} ${issuedCard.currency}</p>
      ${issuedCard.expires_at ? `<p>Vence: ${new Date(issuedCard.expires_at).toLocaleDateString("es-MX")}</p>` : ""}
      <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body></html>
    `);
    win.document.close();
  }

  const inputClass =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)] focus:outline-none transition-colors";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      isDismissable={!isLoading}
      classNames={{
        base: "bg-[var(--bg-card)] border border-[var(--border)]",
        header: "text-[var(--text-primary)] border-b border-[var(--border)]",
        body: "text-[var(--text-secondary)]",
        footer: "border-t border-[var(--border)]",
      }}
    >
      <ModalContent>
        <ModalHeader>
          {issuedCard ? "Tarjeta emitida" : t.gift_cards.issue}
        </ModalHeader>

        {issuedCard ? (
          /* ── Success view ── */
          <>
            <ModalBody>
              <div className="flex flex-col items-center gap-4 py-2">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR para ${issuedCard.code}`}
                    className="rounded-lg border border-[var(--border)]"
                    width={180}
                    height={180}
                  />
                ) : (
                  <div className="h-[180px] w-[180px] rounded-lg border border-[var(--border)] bg-[var(--bg-card-elevated)] animate-pulse" />
                )}
                <div className="text-center">
                  <p className="text-xs text-[var(--text-muted)] mb-1">
                    Código
                  </p>
                  <p className="text-lg font-bold tracking-widest text-[var(--text-primary)]">
                    {issuedCard.code}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm w-full max-w-xs">
                  <span className="text-[var(--text-muted)]">
                    Saldo inicial
                  </span>
                  <span className="text-right font-medium text-[var(--text-primary)]">
                    {formatMXN(parseFloat(issuedCard.initial_balance))}{" "}
                    {issuedCard.currency}
                  </span>
                  <span className="text-[var(--text-muted)]">Estado</span>
                  <span className="text-right text-[var(--success)] font-medium">
                    Activa
                  </span>
                  {issuedCard.expires_at && (
                    <>
                      <span className="text-[var(--text-muted)]">Vence</span>
                      <span className="text-right text-[var(--text-primary)]">
                        {new Date(issuedCard.expires_at).toLocaleDateString(
                          "es-MX",
                        )}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="bordered"
                onPress={handleClose}
                className="border-[var(--border)] text-[var(--text-secondary)]"
              >
                <X size={15} aria-hidden />
                {t.action.close}
              </Button>
              <Button
                onPress={handlePrint}
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white border-0"
              >
                <Printer size={15} aria-hidden />
                {t.action.print}
              </Button>
            </ModalFooter>
          </>
        ) : (
          /* ── Issue form ── */
          <form onSubmit={handleSubmit}>
            <ModalBody>
              <div className="flex flex-col gap-4">
                {apiError && (
                  <p className="rounded-lg border border-[var(--error)] bg-[var(--error-subtle,#fee2e2)] px-3 py-2 text-sm text-[var(--error)]">
                    {apiError}
                  </p>
                )}

                <FormField
                  label={t.gift_cards.initial_balance}
                  required
                  error={errors.initial_balance}
                >
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={form.initial_balance}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        initial_balance: e.target.value,
                      }))
                    }
                    className={inputClass}
                    autoFocus
                  />
                </FormField>

                <FormField label="Moneda" required>
                  <select
                    value={form.currency}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        currency: e.target.value as "MXN" | "USD",
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="MXN">{t.currency.mxn}</option>
                    <option value="USD">{t.currency.usd}</option>
                  </select>
                </FormField>

                <FormField label="Fecha de vencimiento (opcional)">
                  <input
                    type="date"
                    value={form.expires_at}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, expires_at: e.target.value }))
                    }
                    className={inputClass}
                  />
                </FormField>
              </div>
            </ModalBody>

            <ModalFooter>
              <Button
                type="button"
                variant="bordered"
                onPress={handleClose}
                isDisabled={isLoading}
                className="border-[var(--border)] text-[var(--text-secondary)]"
              >
                {t.action.cancel}
              </Button>
              <Button
                type="submit"
                isLoading={isLoading}
                isDisabled={isLoading}
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.96] text-white border-0 font-medium transition"
              >
                {t.gift_cards.issue}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
