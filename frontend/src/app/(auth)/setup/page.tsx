"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@heroui/react";
import { Store, ChevronRight, Check } from "lucide-react";
import { FormField } from "@/components/ui";
import { settingsApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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

const INPUT_CLS = cn(
  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)]",
  "px-3 py-2 text-sm text-[var(--text-primary)] outline-none",
  "placeholder:text-[var(--text-muted)]",
  "transition-colors focus:border-[var(--border-focus)]",
);

export default function SetupPage() {
  const { token } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
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
  const businessType = watch("business_type");

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
                onPress={() => {
                  window.location.replace("/pos");
                }}
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

                  <FormField
                    label={t.settings.business_name}
                    required
                    error={errors.business_name?.message}
                  >
                    <input
                      {...register("business_name")}
                      autoFocus
                      placeholder="Ej. Tienda El Sol"
                      className={INPUT_CLS}
                    />
                  </FormField>

                  <FormField label="WhatsApp de soporte (opcional)">
                    <input
                      {...register("support_whatsapp")}
                      placeholder="+52 55 1234 5678"
                      className={INPUT_CLS}
                    />
                  </FormField>

                  <Button
                    type="button"
                    className="bg-[var(--accent)] text-white border-0"
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

                  <div className="grid grid-cols-3 gap-2">
                    {BUSINESS_TYPES.map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setValue("business_type", key)}
                        className={cn(
                          "rounded-lg border px-3 py-2.5 text-xs font-medium text-left transition-colors",
                          businessType === key
                            ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
                            : "border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:border-[var(--border-focus)] hover:text-[var(--text-primary)]",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {errors.business_type && (
                    <p className="text-xs text-[var(--error)]">
                      {errors.business_type.message}
                    </p>
                  )}

                  {error && (
                    <div className="rounded-lg bg-[var(--error-subtle)] px-4 py-2 text-sm text-[var(--error)]">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="bordered"
                      className="flex-1 border-[var(--border)] text-[var(--text-secondary)]"
                      onPress={() => setStep(1)}
                    >
                      {t.action.back}
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-[var(--accent)] text-white border-0"
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
