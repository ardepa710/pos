import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

type ColorKey = "success" | "info" | "error" | "warning";

const STATUS_MAP: Record<string, ColorKey> = {
  // Success / positive
  completed: "success",
  active: "success",
  received: "success",
  approved: "success",
  // Info / neutral-positive
  pending: "info",
  draft: "info",
  open: "info",
  // Error / negative
  cancelled: "error",
  voided: "error",
  inactive: "error",
  out_of_stock: "error",
  closed: "error",
  refunded: "error",
  // Warning
  warning: "warning",
  low_stock: "warning",
};

const COLOR_CLASSES: Record<ColorKey, string> = {
  success:
    "bg-[var(--success-subtle)] text-[var(--success)] border-[var(--success)]",
  info: "bg-[var(--info-subtle)] text-[var(--info)] border-[var(--info)]",
  error: "bg-[var(--error-subtle)] text-[var(--error)] border-[var(--error)]",
  warning:
    "bg-[var(--warning-subtle)] text-[var(--warning)] border-[var(--warning)]",
};

const SIZE_CLASSES: Record<NonNullable<StatusBadgeProps["size"]>, string> = {
  sm: "px-1.5 py-0.5 text-xs",
  md: "px-2.5 py-1 text-xs",
};

const LABELS: Record<string, string> = {
  completed: "Completado",
  active: "Activo",
  received: "Recibido",
  approved: "Aprobado",
  pending: "Pendiente",
  draft: "Borrador",
  open: "Abierto",
  cancelled: "Cancelado",
  voided: "Anulado",
  inactive: "Inactivo",
  out_of_stock: "Sin stock",
  closed: "Cerrado",
  refunded: "Devuelto",
  warning: "Advertencia",
  low_stock: "Poco stock",
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const colorKey: ColorKey = STATUS_MAP[status] ?? "info";
  const label = LABELS[status] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium leading-none",
        COLOR_CLASSES[colorKey],
        SIZE_CLASSES[size],
      )}
    >
      {label}
    </span>
  );
}
