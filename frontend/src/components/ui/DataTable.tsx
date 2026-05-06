"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  /** Client-side pagination page size. Default 20. */
  pageSize?: number;
  /** Pass together with onPageChange for server-side pagination */
  totalCount?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

type SortDirection = "asc" | "desc" | null;

interface SortState {
  key: string;
  direction: SortDirection;
}

function SkeletonRows({ columns }: { columns: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, rowIdx) => (
        <tr key={rowIdx}>
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td
              key={colIdx}
              className="px-4 py-3 border-b border-[var(--border)]"
            >
              <div className="h-4 rounded bg-[var(--bg-card-elevated)] animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = "No hay datos",
  pageSize = 20,
  totalCount,
  currentPage: externalPage,
  onPageChange,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>({ key: "", direction: null });
  const [internalPage, setInternalPage] = useState(1);

  const isServerPaginated =
    totalCount !== undefined &&
    externalPage !== undefined &&
    onPageChange !== undefined;

  const currentPage = isServerPaginated ? externalPage : internalPage;

  // Client-side sort (only for non-server-paginated tables)
  const sortedData = useMemo(() => {
    if (isServerPaginated || !sort.key || sort.direction === null) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return data;
    return [...data].sort((a, b) => {
      const aVal = col.accessor(a);
      const bVal = col.accessor(b);
      const aStr = String(aVal ?? "");
      const bStr = String(bVal ?? "");
      const cmp = aStr.localeCompare(bStr, "es-MX", { numeric: true });
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [data, sort, columns, isServerPaginated]);

  // Client-side pagination
  const paginatedData = useMemo(() => {
    if (isServerPaginated) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, isServerPaginated]);

  // totalCount is guaranteed to be defined when isServerPaginated is true
  const total = isServerPaginated ? (totalCount as number) : data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, total);

  function handleSort(key: string) {
    setSort((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return { key: "", direction: null };
    });
    // Reset to first page on sort change (client only)
    if (!isServerPaginated) setInternalPage(1);
  }

  function handlePageChange(page: number) {
    if (isServerPaginated) {
      // onPageChange is defined when isServerPaginated is true
      onPageChange!(page);
    } else {
      setInternalPage(page);
    }
  }

  function SortIcon({ colKey }: { colKey: string }) {
    if (sort.key !== colKey || sort.direction === null) {
      return <ChevronsUpDown size={14} className="opacity-40" />;
    }
    return sort.direction === "asc" ? (
      <ChevronUp size={14} />
    ) : (
      <ChevronDown size={14} />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="w-full overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--bg-card)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left font-medium text-[var(--text-secondary)] border-b border-[var(--border)]",
                    col.sortable &&
                      "cursor-pointer select-none hover:text-[var(--text-primary)] transition-colors",
                    col.className,
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && <SortIcon colKey={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <SkeletonRows columns={columns.length} />
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-[var(--text-muted)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={keyExtractor(row)}
                  className={cn(
                    "border-b border-[var(--border)] transition-colors hover:bg-[var(--bg-card-elevated)]",
                    idx % 2 === 0
                      ? "bg-[var(--bg-base)]"
                      : "bg-[var(--bg-card)]",
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3 text-[var(--text-primary)]",
                        col.className,
                      )}
                    >
                      {col.accessor(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination bar */}
      {!isLoading && total > 0 && (
        <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
          <span>
            Mostrando {rangeStart}–{rangeEnd} de {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className={cn(
                "px-3 py-1.5 rounded border border-[var(--border)] transition-colors",
                currentPage <= 1
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-[var(--bg-card-elevated)] cursor-pointer",
              )}
            >
              Anterior
            </button>
            <span className="px-2 tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className={cn(
                "px-3 py-1.5 rounded border border-[var(--border)] transition-colors",
                currentPage >= totalPages
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-[var(--bg-card-elevated)] cursor-pointer",
              )}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
