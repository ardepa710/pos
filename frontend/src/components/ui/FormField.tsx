import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  /** Forwarded to the wrapping div — useful for grid placement */
  style?: React.CSSProperties;
}

export function FormField({
  label,
  error,
  required = false,
  children,
  className,
  style,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)} style={style}>
      <label className="text-sm font-medium text-[var(--text-primary)]">
        {label}
        {required && (
          <span className="ml-1 text-[var(--error)]" aria-hidden>
            *
          </span>
        )}
      </label>

      {children}

      {error && (
        <p role="alert" className="text-xs text-[var(--error)]">
          {error}
        </p>
      )}
    </div>
  );
}
