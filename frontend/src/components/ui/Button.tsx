import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows spinner and disables interaction when true */
  isLoading?: boolean;
  /** Icon rendered before label text */
  icon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: cn(
    "bg-[var(--accent)] text-[var(--accent-foreground)]",
    "hover:bg-[var(--accent-hover)]",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
  ),
  ghost: cn(
    "bg-transparent text-[var(--text-secondary)]",
    "hover:bg-[var(--bg-card-elevated)] hover:text-[var(--text-primary)]",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]",
  ),
  danger: cn(
    "bg-[var(--error-subtle)] text-[var(--error)]",
    "hover:bg-[var(--error)] hover:text-white",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--error)]",
  ),
  outline: cn(
    "border border-[var(--border)] bg-transparent text-[var(--text-primary)]",
    "hover:bg-[var(--bg-card-elevated)]",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]",
  ),
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-[var(--radius)] px-3 text-xs",
  md: "h-9 gap-2 rounded-[var(--radius)] px-4 text-sm",
  lg: "h-10 gap-2 rounded-[var(--radius-lg)] px-5 text-sm",
};

/**
 * Primitive <Button> — use this instead of hand-rolled buttons.
 *
 * Usage:
 *   <Button>Guardar</Button>
 *   <Button variant="ghost" size="sm" icon={<Plus size={14} />}>Agregar</Button>
 *   <Button variant="danger" isLoading={mutation.isPending}>Eliminar</Button>
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      icon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || isLoading;
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          // Base
          "inline-flex shrink-0 items-center justify-center font-medium",
          // Transition — specific properties only, never transition-all
          "transition-colors",
          // Press feedback
          "active:scale-[0.96] transition-transform",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
          // Variant + size
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 size={14} className="animate-spin" aria-hidden />
        ) : (
          icon && <span aria-hidden>{icon}</span>
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
