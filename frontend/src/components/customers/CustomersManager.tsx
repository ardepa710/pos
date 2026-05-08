"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, Pencil } from "lucide-react";
import {
  DataTable,
  type Column,
  SearchInput,
  PageHeader,
  StatusBadge,
  LoadingSpinner,
} from "@/components/ui";
import { customersApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import type { CustomerRead } from "@/types/index";
import { CustomerForm } from "./CustomerForm";
import { CustomerDetail } from "./CustomerDetail";

export function CustomersManager() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRead | null>(
    null,
  );
  const [detailCustomer, setDetailCustomer] = useState<CustomerRead | null>(
    null,
  );

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers", search],
    queryFn: () =>
      customersApi.list(token, { search: search || undefined, limit: 200 }),
    enabled: !!token,
  });

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
  }, []);

  function openCreate() {
    setEditingCustomer(null);
    setFormOpen(true);
  }

  function openEdit(customer: CustomerRead) {
    setEditingCustomer(customer);
    setFormOpen(true);
  }

  function openDetail(customer: CustomerRead) {
    setDetailCustomer(customer);
  }

  function handleFormClose() {
    setFormOpen(false);
    setEditingCustomer(null);
  }

  function handleFormSuccess() {
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    handleFormClose();
  }

  const columns: Column<CustomerRead>[] = [
    {
      key: "full_name",
      header: "Nombre completo",
      sortable: true,
      accessor: (row) => (
        <span className="font-medium text-[var(--text-primary)]">
          {row.full_name}
        </span>
      ),
    },
    {
      key: "email",
      header: t.customers.email,
      accessor: (row) => (
        <span className="text-[var(--text-secondary)]">
          {row.email ?? <span className="text-[var(--text-muted)]">—</span>}
        </span>
      ),
    },
    {
      key: "phone",
      header: t.customers.phone,
      accessor: (row) => (
        <span className="text-[var(--text-secondary)]">
          {row.phone ?? <span className="text-[var(--text-muted)]">—</span>}
        </span>
      ),
    },
    {
      key: "loyalty_points",
      header: t.customers.loyalty_points,
      sortable: true,
      className: "text-right",
      accessor: (row) => (
        <span className="tabular-nums text-[var(--accent)] font-medium">
          {(row.loyalty_points ?? 0).toLocaleString("es-MX")}
        </span>
      ),
    },
    {
      key: "is_active",
      header: "Estado",
      accessor: (row) => (
        <StatusBadge status={row.is_active ? "active" : "inactive"} />
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      className: "w-24",
      accessor: (row) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            title={t.action.view}
            onClick={() => openDetail(row)}
            className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card-elevated)] hover:text-[var(--text-primary)]"
          >
            <Eye size={15} />
          </button>
          <button
            type="button"
            title={t.action.edit}
            onClick={() => openEdit(row)}
            className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card-elevated)] hover:text-[var(--text-primary)]"
          >
            <Pencil size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title={t.nav.customers}
        action={{
          label: t.customers.add_customer,
          icon: <Plus size={16} />,
          onClick: openCreate,
        }}
      />

      <div className="mb-4">
        <SearchInput
          placeholder={t.customers.search_placeholder}
          onSearch={handleSearch}
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={customers ?? []}
          keyExtractor={(row) => row.id}
          emptyMessage="No hay clientes registrados"
        />
      )}

      <CustomerForm
        isOpen={formOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        customer={editingCustomer}
      />

      <CustomerDetail
        customer={detailCustomer}
        onClose={() => setDetailCustomer(null)}
      />
    </div>
  );
}
