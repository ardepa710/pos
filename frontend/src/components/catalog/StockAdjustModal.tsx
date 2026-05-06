"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { FormField } from "@/components/ui";
import type { ProductRead } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

const INPUT_CLASS = cn(
  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)]",
  "px-3 py-2 text-sm text-[var(--text-primary)] outline-none",
  "placeholder:text-[var(--text-muted)]",
  "transition-colors focus:border-[var(--border-focus)]",
);

interface StockAdjustModalProps {
  product: ProductRead;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function StockAdjustModal({
  product,
  onClose,
  onSuccess,
  onError,
}: StockAdjustModalProps) {
  const { token } = useAuth();

  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [deltaError, setDeltaError] = useState("");
  const [reasonError, setReasonError] = useState("");

  const deltaNum = delta === "" ? 0 : parseInt(delta, 10);
  const isValidDelta = delta !== "" && !isNaN(deltaNum) && deltaNum !== 0;
  const preview = product.stock + (isValidDelta ? deltaNum : 0);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `${API_BASE}/v1/products/${product.id}/adjust-stock`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            delta: deltaNum,
            reason: reason.trim() || undefined,
          }),
        },
      );

      if (res.status === 401) {
        throw new Error("Sesión expirada. Por favor inicia sesión nuevamente.");
      }

      if (!res.ok) {
        let msg = `Error ${res.status}`;
        try {
          const body = await res.json();
          msg = body?.detail ?? body?.message ?? msg;
        } catch {
          // Non-JSON response — keep default message
        }
        throw new Error(msg);
      }

      return res.json();
    },
    onSuccess: () => {
      onSuccess("Existencia ajustada correctamente.");
    },
    onError: (err: Error) => {
      onError(err.message || t.error.generic);
    },
  });

  function validate(): boolean {
    let valid = true;

    if (delta === "" || isNaN(deltaNum) || deltaNum === 0) {
      setDeltaError("Ingresa un ajuste diferente de cero.");
      valid = false;
    } else {
      setDeltaError("");
    }

    if (preview < 0) {
      setDeltaError("El stock no puede quedar negativo.");
      valid = false;
    }

    if (!reason.trim()) {
      setReasonError("El motivo es requerido.");
      valid = false;
    } else {
      setReasonError("");
    }

    return valid;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate();
  }

  const isIncrease = deltaNum > 0;
  const isDecrease = deltaNum < 0;

  return (
    <Modal
      isOpen
      onClose={onClose}
      isDismissable={!mutation.isPending}
      hideCloseButton={mutation.isPending}
      size="sm"
      classNames={{
        base: "bg-[var(--bg-card)] border border-[var(--border)]",
        header: "text-[var(--text-primary)] border-b border-[var(--border)]",
        body: "text-[var(--text-secondary)]",
        footer: "border-t border-[var(--border)]",
      }}
    >
      <ModalContent>
        <ModalHeader>
          <div className="flex flex-col gap-0.5">
            <span>Ajustar existencia</span>
            <span className="text-xs font-normal text-[var(--text-muted)]">
              {product.name}
              <span className="ml-2 font-mono">{product.sku}</span>
            </span>
          </div>
        </ModalHeader>

        <ModalBody>
          <form
            id="stock-form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-5 py-1"
          >
            {/* Current / Preview stock display */}
            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card-elevated)] px-4 py-3">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xs text-[var(--text-muted)]">
                  Existencia actual
                </span>
                <span className="text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
                  {product.stock}
                </span>
              </div>

              <div
                className={cn(
                  "flex items-center gap-1 text-sm font-medium",
                  isIncrease
                    ? "text-[var(--success)]"
                    : isDecrease
                      ? "text-[var(--error)]"
                      : "text-[var(--text-muted)]",
                )}
              >
                {isIncrease && <TrendingUp size={16} aria-hidden />}
                {isDecrease && <TrendingDown size={16} aria-hidden />}
                <span className="tabular-nums">
                  {isIncrease
                    ? `+${deltaNum}`
                    : isDecrease
                      ? String(deltaNum)
                      : "±0"}
                </span>
              </div>

              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xs text-[var(--text-muted)]">
                  Resultado
                </span>
                <span
                  className={cn(
                    "text-2xl font-semibold tabular-nums",
                    preview < 0
                      ? "text-[var(--error)]"
                      : "text-[var(--text-primary)]",
                  )}
                >
                  {preview}
                </span>
              </div>
            </div>

            {/* Delta field */}
            <FormField
              label="Ajuste (positivo para agregar, negativo para retirar)"
              required
              error={deltaError}
            >
              <input
                type="number"
                step="1"
                value={delta}
                onChange={(e) => {
                  setDelta(e.target.value);
                  setDeltaError("");
                }}
                placeholder="Ej: 10 o -5"
                className={INPUT_CLASS}
                autoFocus
              />
            </FormField>

            {/* Reason field */}
            <FormField label="Motivo" required error={reasonError}>
              <input
                type="text"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setReasonError("");
                }}
                placeholder="Ej: Inventario físico, merma, devolución…"
                className={INPUT_CLASS}
              />
            </FormField>
          </form>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="bordered"
            onPress={onClose}
            isDisabled={mutation.isPending}
            className="border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-elevated)]"
          >
            {t.action.cancel}
          </Button>
          <Button
            type="submit"
            form="stock-form"
            isLoading={mutation.isPending}
            isDisabled={mutation.isPending}
            className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] border-0 font-medium"
          >
            Aplicar ajuste
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
