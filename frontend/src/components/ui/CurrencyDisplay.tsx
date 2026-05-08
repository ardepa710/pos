import { cn } from "@/lib/utils";
import { formatMXN, formatUSD } from "@/lib/currency";

interface CurrencyDisplayProps {
  /** Decimal string from API or plain number */
  amount: string | number;
  currency?: "MXN" | "USD";
  size?: "sm" | "md" | "lg";
  /** When true, shows a leading + in green for positives and – in red for negatives */
  showSign?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<
  NonNullable<CurrencyDisplayProps["size"]>,
  string
> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl font-semibold",
};

export function CurrencyDisplay({
  amount,
  currency = "MXN",
  size = "md",
  showSign = false,
  className,
}: CurrencyDisplayProps) {
  const numeric = typeof amount === "string" ? parseFloat(amount) : amount;

  const formatted =
    currency === "USD"
      ? formatUSD(Math.abs(numeric))
      : formatMXN(Math.abs(numeric));

  const isNegative = numeric < 0;
  const isPositive = numeric > 0;

  // Sign color only when caller opts in
  const signClass =
    showSign && isNegative
      ? "text-[var(--error)]"
      : showSign && isPositive
        ? "text-[var(--success)]"
        : undefined;

  const prefix = showSign && isPositive ? "+" : isNegative ? "−" : "";

  return (
    <span
      className={cn(
        "tabular-nums text-[var(--text-primary)]",
        SIZE_CLASSES[size],
        signClass,
        className,
      )}
    >
      {prefix}
      {formatted}
    </span>
  );
}
