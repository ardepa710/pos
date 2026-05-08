import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Accessible label — hidden visually but read by screen readers */
  label?: string;
}

const SIZE_PX: Record<NonNullable<LoadingSpinnerProps["size"]>, number> = {
  sm: 16,
  md: 32,
  lg: 64,
};

export function LoadingSpinner({
  size = "md",
  className,
  label = "Cargando…",
}: LoadingSpinnerProps) {
  const px = SIZE_PX[size];
  const borderWidth = size === "sm" ? 2 : size === "md" ? 3 : 4;

  return (
    <div
      role="status"
      aria-label={label}
      className={cn("flex items-center justify-center", className)}
    >
      <span
        style={{
          width: px,
          height: px,
          borderWidth,
          borderStyle: "solid",
          borderColor: "var(--border)",
          borderTopColor: "var(--accent)",
          borderRadius: "50%",
          display: "inline-block",
          animation: "spin 0.7s linear infinite",
        }}
      />
      <span className="sr-only">{label}</span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
