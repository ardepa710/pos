"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { CurrencyDisplay, StatusBadge } from "@/components/ui";
import type { ReturnRead } from "@/types/index";
import { t } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

interface ReturnDetailProps {
  isOpen: boolean;
  onClose: () => void;
  returnRecord: ReturnRead | null;
}

const REFUND_METHOD_LABELS: Record<string, string> = {
  cash: t.returns.refund.cash,
  gift_card: t.returns.refund.gift_card,
  store_credit: t.returns.refund.store_credit,
};

export function ReturnDetail({
  isOpen,
  onClose,
  returnRecord,
}: ReturnDetailProps) {
  if (!returnRecord) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      classNames={{
        base: "bg-[var(--bg-card)] border border-[var(--border)]",
        header: "text-[var(--text-primary)] border-b border-[var(--border)]",
        body: "text-[var(--text-secondary)]",
        footer: "border-t border-[var(--border)]",
      }}
    >
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-3">
            <span>Devolución {returnRecord.folio}</span>
            <StatusBadge status="refunded" size="sm" />
          </div>
        </ModalHeader>

        <ModalBody>
          <div className="flex flex-col gap-5">
            {/* Meta info */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card-elevated)] p-4 text-sm">
              <span className="text-[var(--text-muted)]">Folio</span>
              <span className="font-medium text-[var(--text-primary)]">
                {returnRecord.folio}
              </span>

              <span className="text-[var(--text-muted)]">
                {t.returns.original_sale}
              </span>
              <span className="font-mono text-xs font-medium text-[var(--text-primary)]">
                {returnRecord.original_sale_id}
              </span>

              <span className="text-[var(--text-muted)]">Fecha</span>
              <span className="text-[var(--text-primary)]">
                {formatDate(returnRecord.created_at)}
              </span>

              <span className="text-[var(--text-muted)]">
                {t.returns.refund_method}
              </span>
              <span className="text-[var(--text-primary)]">
                {REFUND_METHOD_LABELS[returnRecord.refund_method] ??
                  returnRecord.refund_method}
              </span>

              <span className="text-[var(--text-muted)]">
                {t.returns.reason}
              </span>
              <span className="text-[var(--text-primary)]">
                {returnRecord.reason}
              </span>

              {returnRecord.generated_gift_card_id && (
                <>
                  <span className="text-[var(--text-muted)]">
                    Tarjeta generada
                  </span>
                  <span className="font-mono text-xs text-[var(--accent)]">
                    {returnRecord.generated_gift_card_id}
                  </span>
                </>
              )}
            </div>

            {/* Total */}
            <div className="flex justify-end">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card-elevated)] px-6 py-3 flex items-center gap-6">
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  {t.returns.total_returned}
                </span>
                <CurrencyDisplay
                  amount={returnRecord.total_returned_mxn}
                  size="lg"
                  showSign={false}
                />
              </div>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            onPress={onClose}
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white border-0"
          >
            {t.action.close}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
