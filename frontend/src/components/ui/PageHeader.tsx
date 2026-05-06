import { cn } from "@/lib/utils";

interface PageHeaderAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: PageHeaderAction;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn("mb-6 flex items-start justify-between gap-4", className)}
    >
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold text-[var(--text-primary)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {subtitle}
          </p>
        )}
      </div>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
            "bg-[var(--accent)] text-[var(--accent-foreground)]",
            "transition-colors hover:bg-[var(--accent-hover)]",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
          )}
        >
          {action.icon}
          {action.label}
        </button>
      )}
    </div>
  );
}
