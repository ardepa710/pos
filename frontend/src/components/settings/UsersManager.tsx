"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { FormField, Input } from "@/components/ui";
import { Plus, Pencil, Trash2, ShieldCheck, User } from "lucide-react";
import { usersApi } from "@/lib/api";
import type { UserRead } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  DataTable,
  type Column,
  ConfirmDialog,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { t } from "@/lib/i18n";

// Password rules must match backend UserCreate validator:
//   min 10 chars · at least one uppercase · at least one digit
const PASSWORD_RULES = z
  .string()
  .min(10, "Mínimo 10 caracteres")
  .refine((v) => /[A-Z]/.test(v), "Debe incluir al menos una mayúscula")
  .refine((v) => /[0-9]/.test(v), "Debe incluir al menos un número");

const userSchema = z.object({
  username: z.string().min(3, "Mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  full_name: z.string().min(2, "Mínimo 2 caracteres"),
  role: z.enum(["admin", "supervisor", "cashier"]),
  // On create: required and must pass rules. On edit: empty = no change.
  password: PASSWORD_RULES.or(z.literal("")).optional(),
  is_active: z.boolean().default(true),
});

type UserFormData = z.infer<typeof userSchema>;

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  cashier: "Cajero",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-[var(--error-subtle)] text-[var(--error)]",
  supervisor: "bg-[var(--warning-subtle)] text-[var(--warning)]",
  cashier: "bg-[var(--success-subtle)] text-[var(--success)]",
};

export function UsersManager() {
  const { token, user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserRead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRead | null>(null);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.list(token),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: UserFormData) =>
      usersApi.create(token, {
        username: data.username,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        password: data.password ?? "",
        is_active: data.is_active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setFormOpen(false);
      setAlert({ type: "success", msg: "Usuario creado exitosamente" });
    },
    onError: () => setAlert({ type: "error", msg: t.error.generic }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UserFormData> }) =>
      usersApi.update(token, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setFormOpen(false);
      setAlert({ type: "success", msg: "Usuario actualizado" });
    },
    onError: () => setAlert({ type: "error", msg: t.error.generic }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(token, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteTarget(null);
      setAlert({ type: "success", msg: "Usuario eliminado" });
    },
    onError: () => setAlert({ type: "error", msg: t.error.generic }),
  });

  const isAdmin = currentUser?.role === "admin";

  function openCreate() {
    setEditTarget(null);
    reset({
      username: "",
      email: "",
      full_name: "",
      role: "cashier",
      password: "",
      is_active: true,
    });
    setFormOpen(true);
  }

  function openEdit(u: UserRead) {
    setEditTarget(u);
    reset({
      username: u.username,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      password: "",
      is_active: u.is_active,
    });
    setFormOpen(true);
  }

  function onSubmit(data: UserFormData) {
    if (editTarget) {
      const payload: Partial<UserFormData> = {
        full_name: data.full_name,
        role: data.role,
        is_active: data.is_active,
      };
      if (data.password) payload.password = data.password;
      updateMutation.mutate({ id: editTarget.id, data: payload });
    } else {
      createMutation.mutate(data);
    }
  }

  const columns: Column<UserRead>[] = [
    {
      key: "username",
      header: "Usuario",
      accessor: (u) => (
        <span className="flex items-center gap-2">
          <User size={14} className="text-[var(--text-muted)]" />
          <span className="font-mono text-sm">{u.username}</span>
        </span>
      ),
    },
    { key: "full_name", header: "Nombre", accessor: (u) => u.full_name },
    {
      key: "email",
      header: "Email",
      accessor: (u) => (
        <span className="text-sm text-[var(--text-secondary)]">{u.email}</span>
      ),
    },
    {
      key: "role",
      header: "Rol",
      accessor: (u) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role] ?? ""}`}
        >
          <ShieldCheck size={10} />
          {ROLE_LABELS[u.role] ?? u.role}
        </span>
      ),
    },
    {
      key: "is_active",
      header: "Estado",
      accessor: (u) => (
        <StatusBadge status={u.is_active ? "active" : "inactive"} />
      ),
    },
    {
      key: "actions",
      header: "",
      accessor: (u) =>
        isAdmin ? (
          <span className="flex gap-2 justify-end">
            <button
              onClick={() => openEdit(u)}
              className="p-1 rounded hover:bg-[var(--bg-card-elevated)] text-[var(--text-secondary)]"
              title={t.action.edit}
            >
              <Pencil size={14} />
            </button>
            {u.id !== currentUser?.id && (
              <button
                onClick={() => setDeleteTarget(u)}
                className="p-1 rounded hover:bg-[var(--bg-card-elevated)] text-[var(--error)]"
                title={t.action.delete}
              >
                <Trash2 size={14} />
              </button>
            )}
          </span>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {alert && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${alert.type === "success" ? "bg-[var(--success-subtle)] text-[var(--success)]" : "bg-[var(--error-subtle)] text-[var(--error)]"}`}
        >
          {alert.msg}
        </div>
      )}

      <div className="flex justify-end">
        {isAdmin && (
          <Button
            onPress={openCreate}
            className="bg-[var(--accent)] text-white"
            startContent={<Plus size={16} />}
          >
            Crear usuario
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={users}
        keyExtractor={(u) => u.id}
        isLoading={isLoading}
        emptyMessage="No hay usuarios"
      />

      {/* Form modal */}
      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} size="md">
        <ModalContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <ModalHeader>
              {editTarget ? t.action.edit + " usuario" : "Crear usuario"}
            </ModalHeader>
            <ModalBody className="flex flex-col gap-3">
              {!editTarget && (
                <FormField
                  label="Usuario"
                  required
                  error={errors.username?.message}
                >
                  <Input
                    {...register("username")}
                    hasError={!!errors.username}
                    placeholder="ej. jperez"
                  />
                </FormField>
              )}
              <FormField
                label="Nombre completo"
                required
                error={errors.full_name?.message}
              >
                <Input
                  {...register("full_name")}
                  hasError={!!errors.full_name}
                  placeholder="ej. Juan Pérez"
                />
              </FormField>
              <FormField
                label={t.customers.email}
                required
                error={errors.email?.message}
              >
                <Input
                  {...register("email")}
                  hasError={!!errors.email}
                  type="email"
                  placeholder="ej. juan@correo.com"
                />
              </FormField>
              <FormField label="Rol" required error={errors.role?.message}>
                <select
                  {...register("role")}
                  className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--border-focus)]"
                >
                  <option value="admin">Administrador</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="cashier">Cajero</option>
                </select>
              </FormField>
              <FormField
                label={
                  editTarget
                    ? "Nueva contraseña (vacío = sin cambio)"
                    : t.auth.password
                }
                error={errors.password?.message}
              >
                <Input
                  {...register("password")}
                  hasError={!!errors.password}
                  type="password"
                  placeholder="••••••••••"
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Mínimo 10 caracteres, una mayúscula y un número.
                </p>
              </FormField>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={() => setFormOpen(false)}>
                {t.action.cancel}
              </Button>
              <Button
                type="submit"
                className="bg-[var(--accent)] text-white"
                isLoading={createMutation.isPending || updateMutation.isPending}
              >
                {t.action.save}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Eliminar usuario"
        message={`¿Eliminar al usuario "${deleteTarget?.username}"? Esta acción no se puede deshacer.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
