"use client";

import { useState, useEffect, useRef } from "react";
import { User, X, Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { customersApi } from "@/lib/api";
import type { CustomerRead } from "@/types/index";
import { LoadingSpinner } from "@/components/ui";

interface CustomerSelectorProps {
  token: string;
  selectedId: string | null;
  selectedName: string | null;
  onSelect: (id: string | null, name: string | null) => void;
}

export function CustomerSelector({
  token,
  selectedId,
  selectedName,
  onSelect,
}: CustomerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search customers on query change
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await customersApi.list(token, {
          search: query || undefined,
          limit: 20,
        });
        setCustomers(result);
      } catch {
        setError(t.error.generic);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, token]);

  // Focus search input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleSelect(customer: CustomerRead) {
    onSelect(customer.id, customer.full_name);
    setOpen(false);
    setQuery("");
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onSelect(null, null);
    setOpen(false);
  }

  return (
    <div ref={panelRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm",
          "transition-colors",
          selectedId
            ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--text-primary)]"
            : "border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-muted)]",
        )}
      >
        <User size={14} className="flex-shrink-0 text-[var(--accent)]" />
        <span className="flex-1 truncate text-left">
          {selectedName ?? t.sales.walk_in}
        </span>
        {selectedId ? (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={(e) =>
              e.key === "Enter" && handleClear(e as unknown as React.MouseEvent)
            }
            aria-label="Quitar cliente"
            className="text-[var(--text-muted)] hover:text-[var(--error)]"
          >
            <X size={14} />
          </span>
        ) : (
          <ChevronDown
            size={14}
            className={cn("transition-transform", open && "rotate-180")}
          />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={cn(
            "absolute bottom-full left-0 right-0 z-50 mb-1",
            "rounded-lg border border-[var(--border)] bg-[var(--bg-card)]",
            "shadow-[var(--shadow-elevated)]",
          )}
        >
          {/* Search */}
          <div className="border-b border-[var(--border)] p-2">
            <div className="relative flex items-center">
              <Search
                size={14}
                className="absolute left-2.5 text-[var(--text-muted)]"
                aria-hidden
              />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.customers.search_placeholder}
                className={cn(
                  "w-full rounded-md border border-[var(--border)] bg-[var(--bg-input)]",
                  "py-1.5 pr-3 pl-8 text-sm text-[var(--text-primary)] outline-none",
                  "placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)]",
                )}
              />
            </div>
          </div>

          {/* Walk-in option */}
          <button
            type="button"
            onClick={() => {
              onSelect(null, null);
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-sm",
              "text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-elevated)]",
              !selectedId &&
                "bg-[var(--accent-subtle)] font-medium text-[var(--accent)]",
            )}
          >
            <User size={14} />
            {t.sales.walk_in}
          </button>

          {/* Results */}
          <div className="max-h-52 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : error ? (
              <p className="px-3 py-2 text-sm text-[var(--error)]">{error}</p>
            ) : customers.length === 0 ? (
              <p className="px-3 py-2 text-sm text-[var(--text-muted)]">
                Sin resultados
              </p>
            ) : (
              customers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={cn(
                    "flex w-full flex-col px-3 py-2 text-left text-sm",
                    "transition-colors hover:bg-[var(--bg-card-elevated)]",
                    selectedId === c.id &&
                      "bg-[var(--accent-subtle)] text-[var(--accent)]",
                  )}
                >
                  <span className="font-medium text-[var(--text-primary)]">
                    {c.full_name}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {c.phone ?? c.email ?? `${c.loyalty_points ?? 0} pts`}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
