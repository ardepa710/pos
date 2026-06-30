import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "olivo" | "mostaza" | "azul" | "tinto" | "cafe";

const TONES: Record<Tone, { halo: string; ring: string; icon: string }> = {
  olivo: {
    halo: "from-[var(--accent-subtle)]",
    ring: "ring-[var(--accent)]/15",
    icon: "text-[var(--accent)]",
  },
  mostaza: {
    halo: "from-[var(--warning-subtle)]",
    ring: "ring-[var(--warning)]/20",
    icon: "text-[var(--warning)]",
  },
  azul: {
    halo: "from-[var(--info-subtle)]",
    ring: "ring-[var(--info)]/20",
    icon: "text-[var(--info)]",
  },
  tinto: {
    halo: "from-[var(--error-subtle)]",
    ring: "ring-[var(--error)]/20",
    icon: "text-[var(--error)]",
  },
  cafe: {
    halo: "from-[var(--surface-subtle,var(--bg-card-elevated))]",
    ring: "ring-[var(--border-strong)]",
    icon: "text-[var(--text-secondary)]",
  },
};

export interface EmptyStateProps {
  /** A Lucide icon element, e.g. <ShoppingCart size={32} /> */
  icon: React.ReactNode;
  title: string;
  hint?: string;
  /** Colored halo tone. Default olivo. */
  tone?: Tone;
  /** Optional action (button/link) rendered below the hint. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Warm, on-brand empty state: a colored gradient halo around a Lucide icon,
 * a title and an optional hint. Replaces the bare muted-icon-and-text pattern.
 */
export function EmptyState({
  icon,
  title,
  hint,
  tone = "olivo",
  action,
  className,
}: EmptyStateProps) {
  const c = TONES[tone];
  return (
    <div
      className={cn(
        "motion-pop flex flex-col items-center justify-center gap-3 px-6 py-10 text-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full ring-1",
          "bg-gradient-to-br to-transparent",
          c.halo,
          c.ring,
          c.icon,
        )}
      >
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </p>
        {hint && (
          <p className="max-w-[28ch] text-xs text-[var(--text-muted)]">
            {hint}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
