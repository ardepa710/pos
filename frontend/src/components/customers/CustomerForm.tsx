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

const CustomerSchema = z.object({
  code: z.string().min(1, t.error.required).max(20),
  full_name: z.string().min(2, t.error.required).max(150),
  email: z
    .string()
    .email("Correo electrónico inválido")
    .or(z.literal(""))
    .optional(),
  phone: z.string().max(20).optional().or(z.literal("")),
  rfc: z.string().max(13).optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  price_tier: z.enum(["general", "a", "b", "c"]).default("general"),
  notes: z.string().optional().or(z.literal("")),
});

type CustomerFormValues = z.infer<typeof CustomerSchema>;

const INPUT_CLS =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--border-focus)]";

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
    defaultValues: { price_tier: "general" },
  });

  useEffect(() => {
    if (isOpen) {
      if (customer) {
        reset({
          code: customer.code,
          full_name: customer.full_name,
          email: customer.email ?? "",
          phone: customer.phone ?? "",
          rfc: customer.rfc ?? "",
          address: customer.address ?? "",
          price_tier:
            (customer.price_tier as "general" | "a" | "b" | "c") ?? "general",
          notes: customer.notes ?? "",
        });
      } else {
        reset({ price_tier: "general" });
      }
    }
  }, [isOpen, customer, reset]);

  const mutation = useMutation({
    mutationFn: (values: CustomerFormValues) => {
      const payload = {
        ...values,
        email: values.email || undefined,
        phone: values.phone || undefined,
        rfc: values.rfc || undefined,
        address: values.address || undefined,
        notes: values.notes || undefined,
      };
      if (isEdit) return customersApi.update(token, customer.id, payload);
      return customersApi.create(token, payload);
    },
    onSuccess,
  });

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
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
          <ModalHeader>
            {isEdit ? "Editar cliente" : "Agregar cliente"}
          </ModalHeader>

          <ModalBody className="gap-4">
            {mutation.isError && (
              <div className="rounded-lg border border-[var(--error)] bg-[var(--error-subtle)] px-3 py-2 text-sm text-[var(--error)]">
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : t.error.generic}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Código" required error={errors.code?.message}>
                <input
                  {...register("code")}
                  className={INPUT_CLS}
                  placeholder="Ej. CLI-001"
                />
              </FormField>
              <FormField
                label="Nivel de precio"
                error={errors.price_tier?.message}
              >
                <select {...register("price_tier")} className={INPUT_CLS}>
                  <option value="general">General</option>
                  <option value="a">Precio A</option>
                  <option value="b">Precio B</option>
                  <option value="c">Precio C</option>
                </select>
              </FormField>
            </div>

            <FormField
              label="Nombre completo"
              required
              error={errors.full_name?.message}
            >
              <input
                {...register("full_name")}
                className={INPUT_CLS}
                placeholder="Nombre completo del cliente"
                autoComplete="name"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={t.customers.email}
                error={errors.email?.message}
              >
                <input
                  {...register("email")}
                  type="email"
                  className={INPUT_CLS}
                  placeholder="correo@ejemplo.com"
                />
              </FormField>
              <FormField
                label={t.customers.phone}
                error={errors.phone?.message}
              >
                <input
                  {...register("phone")}
                  type="tel"
                  className={INPUT_CLS}
                  placeholder="10 dígitos"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label={t.customers.rfc} error={errors.rfc?.message}>
                <input
                  {...register("rfc")}
                  className={INPUT_CLS}
                  placeholder="RFC"
                  maxLength={13}
                  style={{ textTransform: "uppercase" }}
                />
              </FormField>
              <FormField
                label={t.customers.address}
                error={errors.address?.message}
              >
                <input
                  {...register("address")}
                  className={INPUT_CLS}
                  placeholder="Dirección"
                />
              </FormField>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button
              type="button"
              variant="bordered"
              onPress={onClose}
              isDisabled={mutation.isPending}
              className="border-[var(--border)] text-[var(--text-secondary)]"
            >
              {t.action.cancel}
            </Button>
            <Button
              type="submit"
              isLoading={mutation.isPending}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.96] text-white border-0 transition"
            >
              {t.action.save}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
