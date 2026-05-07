"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { FormField } from "@/components/ui";
import { productsApi, suppliersApi } from "@/lib/api";
import type { ProductRead, CategoryRead } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ── Validation schema ────────────────────────────────────────────────────────

const schema = z.object({
  sku: z.string().min(1, t.error.required),
  name: z.string().min(1, t.error.required),
  description: z.string().optional(),
  category_id: z.string().optional(),
  price_general: z
    .string()
    .min(1, t.error.required)
    .refine(
      (v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0,
      "Precio inválido",
    ),
  price_a: z
    .string()
    .optional()
    .refine(
      (v) => !v || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0),
      "Precio inválido",
    ),
  price_b: z
    .string()
    .optional()
    .refine(
      (v) => !v || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0),
      "Precio inválido",
    ),
  price_c: z
    .string()
    .optional()
    .refine(
      (v) => !v || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0),
      "Precio inválido",
    ),
  track_inventory: z.boolean(),
  stock_quantity: z.string().optional(),
  min_stock_alert: z.string().optional(),
  is_active: z.boolean(),
  is_consignment: z.boolean(),
  consigned_supplier_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Shared input class ────────────────────────────────────────────────────────

const INPUT_CLASS = cn(
  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)]",
  "px-3 py-2 text-sm text-[var(--text-primary)] outline-none",
  "placeholder:text-[var(--text-muted)]",
  "transition-colors focus:border-[var(--border-focus)]",
);

// ── Props ────────────────────────────────────────────────────────────────────

interface ProductFormProps {
  product: ProductRead | null;
  categories: CategoryRead[];
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ProductForm({
  product,
  categories,
  onClose,
  onSuccess,
  onError,
}: ProductFormProps) {
  const { token } = useAuth();
  const isEdit = !!product;

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => suppliersApi.list(token),
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      category_id: "",
      price_general: "",
      price_a: "",
      price_b: "",
      price_c: "",
      track_inventory: false,
      stock_quantity: "0",
      min_stock_alert: "0",
      is_active: true,
      is_consignment: false,
      consigned_supplier_id: "",
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (product) {
      reset({
        sku: product.sku,
        name: product.name,
        description: product.description ?? "",
        category_id: product.category_id ?? "",
        price_general: product.price_general,
        price_a: product.price_a ?? "",
        price_b: product.price_b ?? "",
        price_c: product.price_c ?? "",
        track_inventory: product.track_inventory,
        stock_quantity: String(product.stock_quantity ?? 0),
        min_stock_alert: String(
          (product as ProductRead & { min_stock_alert?: number })
            .min_stock_alert ?? 0,
        ),
        is_active: product.is_active,
        is_consignment: product.is_consigned,
        consigned_supplier_id: product.consigned_supplier_id ?? "",
      });
    }
  }, [product, reset]);

  const trackInventory = watch("track_inventory");
  const isConsignment = watch("is_consignment");

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        sku: values.sku,
        name: values.name,
        description: values.description || undefined,
        category_id: values.category_id || undefined,
        price_general: values.price_general,
        price_a: values.price_a || undefined,
        price_b: values.price_b || undefined,
        price_c: values.price_c || undefined,
        track_inventory: values.track_inventory,
        stock_quantity: values.track_inventory
          ? String(values.stock_quantity ?? "0")
          : undefined,
        is_active: values.is_active,
        is_consigned: values.is_consignment,
        consigned_supplier_id: values.is_consignment
          ? values.consigned_supplier_id || undefined
          : undefined,
      };

      return isEdit
        ? productsApi.update(token, product!.id, payload)
        : productsApi.create(token, payload);
    },
    onSuccess: () => {
      onSuccess(
        isEdit
          ? "Producto actualizado correctamente."
          : "Producto creado correctamente.",
      );
    },
    onError: (err: Error) => {
      onError(err.message || t.error.generic);
    },
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      isDismissable={!mutation.isPending}
      hideCloseButton={mutation.isPending}
      size="2xl"
      scrollBehavior="inside"
      classNames={{
        base: "bg-[var(--bg-card)] border border-[var(--border)]",
        header: "text-[var(--text-primary)] border-b border-[var(--border)]",
        body: "text-[var(--text-secondary)]",
        footer: "border-t border-[var(--border)]",
      }}
    >
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center justify-between w-full">
            <span>
              {isEdit ? t.products.edit_product : t.products.add_product}
            </span>
            {!mutation.isPending && (
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </ModalHeader>

        <ModalBody>
          <form
            id="product-form"
            onSubmit={handleSubmit((v) => mutation.mutate(v))}
            className="flex flex-col gap-5 py-1"
          >
            {/* Row 1: SKU + Name */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label={t.products.sku}
                required
                error={errors.sku?.message}
              >
                <input
                  {...register("sku")}
                  placeholder="Ej: PROD-001"
                  className={INPUT_CLASS}
                />
              </FormField>

              <FormField
                label={t.products.name}
                required
                error={errors.name?.message}
              >
                <input
                  {...register("name")}
                  placeholder="Nombre del producto"
                  className={INPUT_CLASS}
                />
              </FormField>
            </div>

            {/* Description */}
            <FormField
              label={t.products.description}
              error={errors.description?.message}
            >
              <textarea
                {...register("description")}
                rows={2}
                placeholder="Descripción opcional"
                className={cn(INPUT_CLASS, "resize-none")}
              />
            </FormField>

            {/* Category */}
            <FormField
              label={t.products.category}
              error={errors.category_id?.message}
            >
              <select {...register("category_id")} className={INPUT_CLASS}>
                <option value="">Sin categoría</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Prices */}
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                Precios (MXN)
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <FormField
                  label={t.products.price_general}
                  required
                  error={errors.price_general?.message}
                >
                  <input
                    {...register("price_general")}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className={INPUT_CLASS}
                  />
                </FormField>

                <FormField
                  label={t.products.price_a}
                  error={errors.price_a?.message}
                >
                  <input
                    {...register("price_a")}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className={INPUT_CLASS}
                  />
                </FormField>

                <FormField
                  label={t.products.price_b}
                  error={errors.price_b?.message}
                >
                  <input
                    {...register("price_b")}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className={INPUT_CLASS}
                  />
                </FormField>

                <FormField
                  label={t.products.price_c}
                  error={errors.price_c?.message}
                >
                  <input
                    {...register("price_c")}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className={INPUT_CLASS}
                  />
                </FormField>
              </div>
            </div>

            {/* Inventory */}
            <div className="flex flex-col gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card-elevated)] p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  {...register("track_inventory")}
                  type="checkbox"
                  className="h-4 w-4 rounded accent-[var(--accent)]"
                />
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {t.products.track_inventory}
                </span>
              </label>

              {trackInventory && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    label={t.products.stock}
                    error={errors.stock_quantity?.message}
                  >
                    <input
                      {...register("stock_quantity")}
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      className={INPUT_CLASS}
                    />
                  </FormField>

                  <FormField
                    label={t.products.min_stock}
                    error={errors.min_stock_alert?.message}
                  >
                    <input
                      {...register("min_stock_alert")}
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      className={INPUT_CLASS}
                    />
                  </FormField>
                </div>
              )}
            </div>

            {/* Consignment */}
            <div className="flex flex-col gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card-elevated)] p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  {...register("is_consignment")}
                  type="checkbox"
                  className="h-4 w-4 rounded accent-[var(--accent)]"
                />
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {t.products.is_consignment}
                </span>
              </label>

              {isConsignment && (
                <FormField
                  label={t.products.supplier}
                  error={errors.consigned_supplier_id?.message}
                >
                  <select
                    {...register("consigned_supplier_id")}
                    className={INPUT_CLASS}
                  >
                    <option value="">Seleccionar proveedor…</option>
                    {suppliers?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.legal_name}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}
            </div>

            {/* Active */}
            <label className="flex cursor-pointer items-center gap-3">
              <input
                {...register("is_active")}
                type="checkbox"
                className="h-4 w-4 rounded accent-[var(--accent)]"
              />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Producto activo
              </span>
            </label>
          </form>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="bordered"
            onPress={onClose}
            isDisabled={mutation.isPending}
            className="border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-elevated)]"
          >
            {t.action.cancel}
          </Button>
          <Button
            type="submit"
            form="product-form"
            isLoading={mutation.isPending}
            isDisabled={mutation.isPending}
            className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] border-0 font-medium"
          >
            {t.action.save}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
