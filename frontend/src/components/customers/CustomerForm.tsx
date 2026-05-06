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
import { customersApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import type { CustomerRead } from "@/types/index";

// ── Validation schema ──────────────────────────────────────────────────────

const CustomerSchema = z.object({
  first_name: z.string().min(1, t.error.required),
  last_name: z.string().min(1, t.error.required),
  email: z
    .string()
    .email("Correo electrónico inválido")
    .or(z.literal(""))
    .optional(),
  phone: z.string().max(20).optional().or(z.literal("")),
  rfc: z
    .string()
    .max(13, "El RFC no puede tener más de 13 caracteres")
    .optional()
    .or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  is_active: z.boolean(),
});

type CustomerFormValues = z.infer<typeof CustomerSchema>;

// ── Input / textarea styling helpers ──────────────────────────────────────

const INPUT_CLS =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--border-focus)]";

const TEXTAREA_CLS = `${INPUT_CLS} resize-none`;

// ── Component ──────────────────────────────────────────────────────────────

interface CustomerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customer?: CustomerRead | null;
}

export function CustomerForm({
  isOpen,
  onClose,
  onSuccess,
  customer,
}: CustomerFormProps) {
  const { token } = useAuth();
  const isEdit = !!customer;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(CustomerSchema),
    defaultValues: { is_active: true },
  });

  // Populate form when editing
  useEffect(() => {
    if (isOpen) {
      if (customer) {
        reset({
          first_name: customer.first_name,
          last_name: customer.last_name,
          email: customer.email ?? "",
          phone: customer.phone ?? "",
          rfc: customer.rfc ?? "",
          address:
            (customer as CustomerRead & { address?: string }).address ?? "",
          is_active: customer.is_active,
        });
      } else {
        reset({ is_active: true });
      }
    }
  }, [isOpen, customer, reset]);

  const mutation = useMutation({
    mutationFn: (values: CustomerFormValues) => {
      // Strip empty strings → undefined so backend doesn't receive empty ""
      const payload = {
        ...values,
        email: values.email || undefined,
        phone: values.phone || undefined,
        rfc: values.rfc || undefined,
        address: values.address || undefined,
      };
      if (isEdit) {
        return customersApi.update(token, customer.id, payload);
      }
      return customersApi.create(token, payload);
    },
    onSuccess,
  });

  function onSubmit(values: CustomerFormValues) {
    mutation.mutate(values);
  }

  const title = isEdit ? "Editar cliente" : "Agregar cliente";

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

            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Nombre"
                required
                error={errors.first_name?.message}
              >
                <input
                  {...register("first_name")}
                  className={INPUT_CLS}
                  placeholder="Nombre(s)"
                  autoComplete="given-name"
                />
              </FormField>

              <FormField
                label="Apellido"
                required
                error={errors.last_name?.message}
              >
                <input
                  {...register("last_name")}
                  className={INPUT_CLS}
                  placeholder="Apellido(s)"
                  autoComplete="family-name"
                />
              </FormField>
            </div>

            {/* Email */}
            <FormField label={t.customers.email} error={errors.email?.message}>
              <input
                {...register("email")}
                type="email"
                className={INPUT_CLS}
                placeholder="correo@ejemplo.com"
                autoComplete="email"
              />
            </FormField>

            {/* Phone + RFC row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={t.customers.phone}
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

              <FormField label={t.customers.rfc} error={errors.rfc?.message}>
                <input
                  {...register("rfc")}
                  className={INPUT_CLS}
                  placeholder="RFC del cliente"
                  maxLength={13}
                  style={{ textTransform: "uppercase" }}
                />
              </FormField>
            </div>

            {/* Address */}
            <FormField
              label={t.customers.address}
              error={errors.address?.message}
            >
              <textarea
                {...register("address")}
                rows={2}
                className={TEXTAREA_CLS}
                placeholder="Calle, número, colonia, ciudad…"
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
                Cliente activo
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
