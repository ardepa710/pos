"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { Star, ShoppingBag, Mail, Phone, FileText, MapPin } from "lucide-react";
import { StatusBadge, LoadingSpinner } from "@/components/ui";
import { salesApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import type { CustomerRead } from "@/types/index";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon
        size={15}
        className="mt-0.5 shrink-0 text-[var(--text-muted)]"
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
        <p className="text-sm text-[var(--text-primary)] break-words">
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

interface CustomerDetailProps {
  customer: CustomerRead | null;
  onClose: () => void;
}

export function CustomerDetail({ customer, onClose }: CustomerDetailProps) {
  const { token } = useAuth();
  const isOpen = !!customer;

  const { data: recentSales, isLoading: salesLoading } = useQuery({
    queryKey: ["sales", "by-customer", customer?.id],
    queryFn: () =>
      salesApi.list(token, {
        customer_id: customer!.id,
        limit: 5,
        status: "completed",
      }),
    enabled: isOpen && !!customer?.id,
  });

  if (!customer) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      classNames={{
        base: "bg-[var(--bg-card)] border border-[var(--border)]",
        header: "text-[var(--text-primary)] border-b border-[var(--border)]",
        body: "text-[var(--text-secondary)]",
        footer: "border-t border-[var(--border)]",
      }}
    >
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <span>{customer.full_name}</span>
            <StatusBadge
              status={customer.is_active ? "active" : "inactive"}
              size="sm"
            />
          </div>
        </ModalHeader>

        <ModalBody className="gap-6">
          {/* Loyalty points hero */}
          <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-subtle)] p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Star
                size={18}
                className="text-[var(--accent)]"
                aria-hidden
                fill="currentColor"
              />
              <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                {t.customers.loyalty_points}
              </span>
            </div>
            <p className="text-4xl font-bold tabular-nums text-[var(--accent)]">
              {customer.loyalty_points.toLocaleString("es-MX")}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              puntos acumulados
            </p>
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoRow
              icon={Mail}
              label={t.customers.email}
              value={customer.email}
            />
            <InfoRow
              icon={Phone}
              label={t.customers.phone}
              value={customer.phone}
            />
            <InfoRow
              icon={FileText}
              label={t.customers.rfc}
              value={customer.rfc}
            />
            <InfoRow
              icon={MapPin}
              label={t.customers.address}
              value={(customer as CustomerRead & { address?: string }).address}
            />
          </div>

          {/* Recent purchases */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <ShoppingBag
                size={15}
                className="text-[var(--text-muted)]"
                aria-hidden
              />
              <h3 className="text-sm font-medium text-[var(--text-primary)]">
                Últimas compras
              </h3>
            </div>

            {salesLoading ? (
              <div className="flex justify-center py-6">
                <LoadingSpinner />
              </div>
            ) : !recentSales || recentSales.length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--text-muted)]">
                Sin compras registradas
              </p>
            ) : (
              <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] overflow-hidden">
                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between gap-4 px-4 py-3 bg-[var(--bg-base)] hover:bg-[var(--bg-card-elevated)] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
                        {sale.folio}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {formatDate(sale.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={sale.status} size="sm" />
                      <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                        {formatCurrency(sale.total_mxn)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="bordered"
            onPress={onClose}
            className="border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-elevated)]"
          >
            {t.action.close}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
