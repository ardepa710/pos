"use client";

import { useState, useCallback, useRef, type ChangeEvent } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  placeholder?: string;
  onSearch: (value: string) => void;
  debounceMs?: number;
  className?: string;
}

export function SearchInput({
  placeholder = "Buscar…",
  onSearch,
  debounceMs = 300,
  className,
}: SearchInputProps) {
  const [value, setValue] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emit = useCallback(
    (val: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onSearch(val), debounceMs);
    },
    [onSearch, debounceMs],
  );

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setValue(val);
    emit(val);
  }

  function handleClear() {
    setValue("");
    if (timerRef.current) clearTimeout(timerRef.current);
    onSearch("");
  }

  return (
    <div className={cn("relative flex items-center", className)}>
      <Search
        size={16}
        className="pointer-events-none absolute left-3 text-[var(--text-muted)]"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)]",
          "py-2 pr-9 pl-9 text-sm text-[var(--text-primary)] outline-none",
          "placeholder:text-[var(--text-muted)]",
          "transition-colors focus:border-[var(--border-focus)]",
        )}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Limpiar búsqueda"
          className={cn(
            "absolute right-2.5 flex items-center justify-center rounded p-0.5",
            "text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]",
          )}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
