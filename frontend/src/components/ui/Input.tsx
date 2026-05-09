import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Shows error ring when true */
  hasError?: boolean;
}

/**
 * Primitive <Input> — base input with design-system tokens.
 * Forwards all native input props. Wrap with <FormField> for label + error message.
 *
 * Usage:
 *   <Input placeholder="Buscar..." />
 *   <Input hasError={!!errors.name} {...register("name")} />
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          // Layout
          "w-full rounded-[var(--radius)] px-3 py-2 text-sm",
          // Colors
          "border bg-[var(--bg-input)] text-[var(--text-primary)]",
          // Border + focus — error state keeps error color on focus
          hasError
            ? "border-[var(--error)] focus:border-[var(--error)]"
            : "border-[var(--border)] focus:border-[var(--border-focus)]",
          // Base
          "outline-none transition-colors",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Placeholder
          "placeholder:text-[var(--text-muted)]",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
