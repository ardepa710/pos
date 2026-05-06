"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { AlertTriangle, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

const VARIANT_CONFIG = {
  danger: {
    icon: AlertCircle,
    iconClass: "text-[var(--error)]",
    confirmClass: "bg-[var(--error)] hover:opacity-90 text-white border-0",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-[var(--warning)]",
    confirmClass: "bg-[var(--warning)] hover:opacity-90 text-black border-0",
  },
  info: {
    icon: Info,
    iconClass: "text-[var(--info)]",
    confirmClass:
      "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white border-0",
  },
} as const;

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  isLoading = false,
}: ConfirmDialogProps) {
  const { icon: Icon, iconClass, confirmClass } = VARIANT_CONFIG[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isDismissable={!isLoading}
      hideCloseButton={isLoading}
      classNames={{
        base: "bg-[var(--bg-card)] border border-[var(--border)]",
        header: "text-[var(--text-primary)] border-b border-[var(--border)]",
        body: "text-[var(--text-secondary)]",
        footer: "border-t border-[var(--border)]",
      }}
    >
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Icon size={20} className={iconClass} aria-hidden />
            <span>{title}</span>
          </div>
        </ModalHeader>

        <ModalBody>
          <p className="text-sm leading-relaxed">{message}</p>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="bordered"
            onPress={onClose}
            isDisabled={isLoading}
            className="border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-elevated)]"
          >
            {cancelLabel}
          </Button>
          <Button
            onPress={onConfirm}
            isLoading={isLoading}
            isDisabled={isLoading}
            className={cn("font-medium", confirmClass)}
          >
            {confirmLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
