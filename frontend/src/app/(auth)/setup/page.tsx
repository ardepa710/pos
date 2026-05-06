"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Select, SelectItem } from "@heroui/react";
import { Store, ChevronRight, Check } from "lucide-react";
import { settingsApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";

const BUSINESS_TYPES = [
  { key: "general", label: "General" },
  { key: "clothing", label: "Ropa y accesorios" },
  { key: "jewelry", label: "Joyería" },
  { key: "electronics", label: "Electrónica" },
  { key: "food", label: "Alimentos y bebidas" },
  { key: "beauty", label: "Belleza y cuidado personal" },
  { key: "pharmacy", label: "Farmacia" },
  { key: "hardware", label: "Ferretería" },
  { key: "books", label: "Libros y papelería" },
  { key: "sports", label: "Deportes" },
  { key: "toys", label: "Juguetes" },
  { key: "other", label: "Otro" },
];

const schema = z.object({
  business_name: z.string().min(1, t.error.required).max(120),
  business_type: z.string().min(1, t.error.required),
  support_whatsapp: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type Step = 1 | 2 | 3;

const STEPS = [
  { step: 1 as Step, label: "Tu negocio" },
  { step: 2 as Step, label: "Tipo de comercio" },
  { step: 3 as Step, label: "Listo" },
];

export default function SetupPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      business_name: "",
      business_type: "general",
      support_whatsapp: "",
    },
  });

  const businessName = watch("business_name");

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError(null);
    try {
      await settingsApi.updateBusiness(token, {
        business_name: data.business_name,
        business_type: data.business_type,
        support_whatsapp: data.support_whatsapp ?? "",
      });
      await settingsApi.completeWizard(token);
      setStep(3);
    } catch {
      setError(t.error.generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent-subtle)] mb-4">
            <Store size={32} className="text-[var(--accent)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {t.settings.wizard_title}
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            {t.settings.wizard_subtitle}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map(({ step: s, label }) => (
            <div key={s} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    step > s
                      ? "bg-[var(--success)] text-white"
                      : step === s
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)]"
                  }`}
                >
                  {step > s ? <Check size={12} /> : s}
                </div>
                <span
                  className={`text-xs hidden sm:inline ${
                    step === s
                      ? "text-[var(--text-primary)] font-medium"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {label}
                </span>
              </div>
              {s < 3 && (
                <ChevronRight size={14} className="text-[var(--text-muted)]" />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-[var(--shadow-modal)]">
          {step === 3 ? (
            /* Completion screen */
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--success-subtle)] flex items-center justify-center">
                <Check size={32} className="text-[var(--success)]" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                ¡Todo listo!
              </h2>
              <p className="text-[var(--text-secondary)]">
                {businessName} está configurado y listo para usarse.
              </p>
              <Button
                className="mt-4 bg-[var(--accent)] text-white w-full"
                onPress={() => router.replace("/pos")}
              >
                Ir al Punto de Venta
              </Button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-5"
            >
              {step === 1 && (
                <>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    ¿Cómo se llama tu negocio?
                  </h2>
                  <Input
                    label={t.settings.business_name}
                    placeholder="Ej. Tienda El Sol"
                    autoFocus
                    {...register("business_name")}
                    isInvalid={!!errors.business_name}
                    errorMessage={errors.business_name?.message}
                  />
                  <Input
                    label="WhatsApp de soporte (opcional)"
                    placeholder="+52 55 1234 5678"
                    {...register("support_whatsapp")}
                  />
                  <Button
                    type="button"
                    className="bg-[var(--accent)] text-white"
                    onPress={() => setStep(2)}
                    isDisabled={!businessName?.trim()}
                    endContent={<ChevronRight size={16} />}
                  >
                    Siguiente
                  </Button>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    ¿Qué tipo de comercio es?
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] -mt-2">
                    Esto ajusta los campos de atributos en los productos.
                  </p>
                  <Select
                    label={t.settings.business_type}
                    {...register("business_type")}
                    isInvalid={!!errors.business_type}
                    errorMessage={errors.business_type?.message}
                  >
                    {BUSINESS_TYPES.map(({ key, label }) => (
                      <SelectItem key={key}>{label}</SelectItem>
                    ))}
                  </Select>

                  {error && (
                    <div className="rounded-lg bg-[var(--error-subtle)] px-4 py-2 text-sm text-[var(--error)]">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="flat"
                      className="flex-1"
                      onPress={() => setStep(1)}
                    >
                      {t.action.back}
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-[var(--accent)] text-white"
                      isLoading={loading}
                      endContent={!loading && <Check size={16} />}
                    >
                      Finalizar configuración
                    </Button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
