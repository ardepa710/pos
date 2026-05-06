"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { FormField } from "@/components/ui";
import { suppliersApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import type { SupplierRead } from "@/types/index";

// ── Validation schema ──────────────────────────────────────────────────────

const SupplierSchema = z.object({
  name: z.string().min(1, t.error.required),
  contact_name: z.string().optional().or(z.literal("")),
  email: z
    .string()
    .email("Correo electrónico inválido")
    .or(z.literal(""))
    .optional(),
  phone: z.string().max(20).optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  rfc: z
    .string()
    .max(13, "El RFC no puede tener más de 13 caracteres")
    .optional()
    .or(z.literal("")),
  payment_terms: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  is_active: z.boolean(),
});

type SupplierFormValues = z.infer<typeof SupplierSchema>;

// ── Input / textarea styling helpers ──────────────────────────────────────

const INPUT_CLS =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--border-focus)]";

const TEXTAREA_CLS = `${INPUT_CLS} resize-none`;

// ── Component ──────────────────────────────────────────────────────────────

interface SupplierFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier?: SupplierRead | null;
}

export function SupplierForm({
  isOpen,
  onClose,
  onSuccess,
  supplier,
}: SupplierFormProps) {
  const { token } = useAuth();
  const isEdit = !!supplier;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(SupplierSchema),
    defaultValues: { is_active: true },
  });

  // Populate form when editing
  useEffect(() => {
    if (isOpen) {
      if (supplier) {
        const s = supplier as SupplierRead & {
          address?: string;
          rfc?: string;
          payment_terms?: string;
          notes?: string;
        };
        reset({
          name: s.name,
          contact_name: s.contact_name ?? "",
          email: s.email ?? "",
          phone: s.phone ?? "",
          address: s.address ?? "",
          rfc: s.rfc ?? "",
          payment_terms: s.payment_terms ?? "",
          notes: s.notes ?? "",
          is_active: s.is_active,
        });
      } else {
        reset({ is_active: true });
      }
    }
  }, [isOpen, supplier, reset]);

  const mutation = useMutation({
    mutationFn: (values: SupplierFormValues) => {
      // Strip empty strings → undefined
      const payload = {
        ...values,
        contact_name: values.contact_name || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        address: values.address || undefined,
        rfc: values.rfc || undefined,
        payment_terms: values.payment_terms || undefined,
        notes: values.notes || undefined,
      };
      if (isEdit) {
        return suppliersApi.update(token, supplier.id, payload);
      }
      return suppliersApi.create(token, payload);
    },
    onSuccess,
  });

  function onSubmit(values: SupplierFormValues) {
    mutation.mutate(values);
  }

  const title = isEdit ? "Editar proveedor" : "Agregar proveedor";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      isDismissable={!mutation.isPending}
      hideCloseButton={mutation.isPending}
      classNames={{
        base: "bg-[var(--bg-card)] border border-[var(--border)]",
        header: "text-[var(--text-primary)] border-b border-[var(--border)]",
        body: "text-[var(--text-secondary)]",
        footer: "border-t border-[var(--border)]",
      }}
    >
      <ModalContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <ModalHeader>{title}</ModalHeader>

          <ModalBody className="gap-4">
            {mutation.isError && (
              <div className="rounded-lg border border-[var(--error)] bg-[var(--error-subtle)] px-3 py-2 text-sm text-[var(--error)]">
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : t.error.generic}
              </div>
            )}

            {/* Name (required) */}
            <FormField
              label={t.suppliers.name}
              required
              error={errors.name?.message}
            >
              <input
                {...register("name")}
                className={INPUT_CLS}
                placeholder="Nombre del proveedor"
                autoComplete="organization"
              />
            </FormField>

            {/* Contact + email row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={t.suppliers.contact_name}
                error={errors.contact_name?.message}
              >
                <input
                  {...register("contact_name")}
                  className={INPUT_CLS}
                  placeholder="Nombre del contacto"
                  autoComplete="name"
                />
              </FormField>

              <FormField
                label={t.suppliers.email}
                error={errors.email?.message}
              >
                <input
                  {...register("email")}
                  type="email"
                  className={INPUT_CLS}
                  placeholder="correo@proveedor.com"
                  autoComplete="email"
                />
              </FormField>
            </div>

            {/* Phone + RFC row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={t.suppliers.phone}
                error={errors.phone?.message}
              >
                <input
                  {...register("phone")}
                  type="tel"
                  className={INPUT_CLS}
                  placeholder="10 dígitos"
                  autoComplete="tel"
                />
              </FormField>

              <FormField label="RFC" error={errors.rfc?.message}>
                <input
                  {...register("rfc")}
                  className={INPUT_CLS}
                  placeholder="RFC del proveedor"
                  maxLength={13}
                  style={{ textTransform: "uppercase" }}
                />
              </FormField>
            </div>

            {/* Address */}
            <FormField label="Dirección" error={errors.address?.message}>
              <textarea
                {...register("address")}
                rows={2}
                className={TEXTAREA_CLS}
                placeholder="Calle, número, colonia, ciudad…"
              />
            </FormField>

            {/* Payment terms */}
            <FormField
              label="Condiciones de pago"
              error={errors.payment_terms?.message}
            >
              <textarea
                {...register("payment_terms")}
                rows={2}
                className={TEXTAREA_CLS}
                placeholder="Ej: 30 días neto, contado, crédito…"
              />
            </FormField>

            {/* Notes */}
            <FormField label="Notas" error={errors.notes?.message}>
              <textarea
                {...register("notes")}
                rows={2}
                className={TEXTAREA_CLS}
                placeholder="Observaciones adicionales"
              />
            </FormField>

            {/* Active toggle */}
            <label className="flex cursor-pointer items-center gap-3">
              <input
                {...register("is_active")}
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
              />
              <span className="text-sm text-[var(--text-primary)]">
                Proveedor activo
              </span>
            </label>
          </ModalBody>

          <ModalFooter>
            <Button
              type="button"
              variant="bordered"
              onPress={onClose}
              isDisabled={mutation.isPending}
              className="border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-elevated)]"
            >
              {t.action.cancel}
            </Button>
            <Button
              type="submit"
              isLoading={mutation.isPending}
              isDisabled={mutation.isPending}
              className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] border-0 font-medium"
            >
              {t.action.save}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
