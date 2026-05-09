// ============================================================================
// KOLEKTO · DESIGN TOKENS v1.0
// Theme: Verde Olivo · Generated 2026-05-07
// ============================================================================
// Fuente única de verdad para colores, tipografía, espaciado y radios.
// Cualquier cambio de branding se hace AQUÍ, no en componentes.
// ============================================================================

export const tokens = {
  // ==========================================================================
  // COLORES
  // ==========================================================================
  // Regla de oro: Olivo (acento) NUNCA se usa para texto largo, fondos de
  // párrafo, ni fondos de cards. Solo para CTAs primarios, estados activos,
  // indicadores de identidad de vendedor, y el "punto del usuario" en la marca.
  // ==========================================================================
  color: {
    // ---- LIGHT THEME ----
    light: {
      // Superficies
      bg: "#F5F1EA", // Hueso · fondo principal de la app
      surface: "#FFFFFF", // Blanco puro · cards, modales, menús
      surfaceMuted: "#E8E2D5", // Arena · estados hover, secciones secundarias
      surfaceSubtle: "#F0F0E5", // Verde muy lavado · pills, badges suaves

      // Texto
      text: "#1A1A1A", // Tinta · texto principal
      textSecondary: "#3D4326", // Olivo oscuro · texto que acompaña al acento
      textMuted: "#8C8478", // Piedra · captions, timestamps, helpers
      textInverse: "#F5F1EA", // Hueso sobre fondos oscuros

      // Acento (USAR CON DISCIPLINA)
      accent: "#6B7A3F", // Olivo · CTA primario, "punto activo"
      accentHover: "#5A6835", // Olivo presionado
      accentSubtle: "#A4B364", // Olivo claro · NO usar en light theme excepto en disabled

      // Bordes
      border: "#E8E2D5", // Borde estándar
      borderStrong: "#D8D2C4", // Borde de inputs, divisores marcados
      borderSubtle: "#F0EAE0", // Borde casi invisible

      // Estados semánticos (mantenidos genéricos, sin teñir hacia olivo)
      success: "#6B7A3F", // Reusamos olivo para success
      warning: "#C49A3F", // Mostaza, complementario a olivo
      error: "#A04540", // Tinto, complementario a olivo
      info: "#4A6B7A", // Azul piedra
    },

    // ---- DARK THEME ----
    dark: {
      bg: "#14150F", // Noche
      surface: "#1F2018", // Card sobre fondo
      surfaceMuted: "#2A2C24", // Carbón · hover, secciones
      surfaceSubtle: "#252720", // Entre noche y carbón

      text: "#E8E2D5", // Crema
      textSecondary: "#A4B364", // Olivo claro · acompaña al acento
      textMuted: "#6B665C", // Piedra cálida
      textInverse: "#1A1A1A",

      accent: "#A4B364", // Olivo claro · sube luminosidad para contraste
      accentHover: "#B4C374",
      accentSubtle: "#3D4326",

      border: "#2A2C24",
      borderStrong: "#3D3E33",
      borderSubtle: "#1F2018",

      success: "#A4B364",
      warning: "#D4B05F",
      error: "#C46560",
      info: "#7A95A4",
    },
  },

  // ==========================================================================
  // TIPOGRAFÍA
  // ==========================================================================
  font: {
    sans: '"Inter", system-ui, -apple-system, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, "SF Mono", monospace',

    weight: {
      regular: 400,
      medium: 500, // Único peso "fuerte" usado · para títulos y énfasis
      semibold: 600, // Solo en casos muy puntuales
    },

    // Escala tipográfica · letter-spacing negativo para tamaños grandes
    size: {
      xs: {
        fontSize: "0.6875rem",
        lineHeight: "1rem",
        letterSpacing: "0.02em",
      }, // 11px · captions
      sm: { fontSize: "0.8125rem", lineHeight: "1.125rem", letterSpacing: "0" }, // 13px · body small
      base: {
        fontSize: "0.875rem",
        lineHeight: "1.375rem",
        letterSpacing: "0",
      }, // 14px · body
      md: { fontSize: "1rem", lineHeight: "1.5rem", letterSpacing: "-0.005em" }, // 16px
      lg: {
        fontSize: "1.125rem",
        lineHeight: "1.625rem",
        letterSpacing: "-0.01em",
      }, // 18px
      xl: {
        fontSize: "1.375rem",
        lineHeight: "1.875rem",
        letterSpacing: "-0.015em",
      }, // 22px
      "2xl": {
        fontSize: "1.75rem",
        lineHeight: "2.25rem",
        letterSpacing: "-0.025em",
      }, // 28px
      "3xl": {
        fontSize: "2.25rem",
        lineHeight: "2.75rem",
        letterSpacing: "-0.03em",
      }, // 36px
      "4xl": {
        fontSize: "3rem",
        lineHeight: "3.25rem",
        letterSpacing: "-0.035em",
      }, // 48px
    },
  },

  // ==========================================================================
  // ESPACIADO · escala 4px
  // ==========================================================================
  space: {
    0: "0",
    1: "0.25rem", //  4px
    2: "0.5rem", //  8px
    3: "0.75rem", // 12px
    4: "1rem", // 16px
    5: "1.25rem", // 20px
    6: "1.5rem", // 24px
    8: "2rem", // 32px
    10: "2.5rem", // 40px
    12: "3rem", // 48px
    16: "4rem", // 64px
    20: "5rem", // 80px
  },

  // ==========================================================================
  // RADIOS
  // ==========================================================================
  radius: {
    none: "0",
    sm: "0.25rem", // 4px  · checkboxes, badges pequeños
    md: "0.375rem", // 6px  · inputs, botones
    lg: "0.625rem", // 10px · cards
    xl: "0.875rem", // 14px · contenedores grandes
    "2xl": "1.25rem", // 20px · modales
    full: "9999px",
  },

  // ==========================================================================
  // SOMBRAS · usar con moderación, preferir bordes
  // ==========================================================================
  shadow: {
    none: "none",
    sm: "0 1px 2px 0 rgb(26 26 26 / 0.04)",
    md: "0 2px 8px -2px rgb(26 26 26 / 0.06), 0 1px 4px -1px rgb(26 26 26 / 0.04)",
    lg: "0 8px 24px -8px rgb(26 26 26 / 0.10), 0 4px 8px -4px rgb(26 26 26 / 0.06)",
  },

  // ==========================================================================
  // TRANSICIONES
  // ==========================================================================
  transition: {
    fast: "120ms cubic-bezier(0.4, 0, 0.2, 1)",
    base: "180ms cubic-bezier(0.4, 0, 0.2, 1)",
    slow: "240ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  // ==========================================================================
  // KOLEKTO-ESPECÍFICO · Vendor identity color system
  // ==========================================================================
  // En Kolekto, cada vendedor del colectivo tiene un "punto" de identidad.
  // El vendedor activo siempre se renderea con accent (olivo). Los otros
  // vendedores rotan en esta paleta para diferenciarse en listados.
  // ==========================================================================
  vendorIdentity: [
    "#6B7A3F", // Olivo (reservado para vendedor activo)
    "#1A1A1A", // Tinta
    "#8B6F4F", // Café
    "#A04540", // Tinto
    "#4A6B7A", // Azul piedra
    "#7A6B4F", // Marrón
    "#C49A3F", // Mostaza
    "#704830", // Tabaco
    "#3D4326", // Olivo profundo
    "#9C7B5C", // Arena tostada
  ],
};

// ============================================================================
// DS-5: BRAND DEFAULT COLOR
// ============================================================================

/** Default Kolekto brand accent — Olivo. Use this instead of the raw hex literal. */
export const BRAND_DEFAULT_COLOR = tokens.color.light.accent; // "#6B7A3F"

// ============================================================================
// DS-4: CSS VARIABLES — typed objects mapping CSS var names to token values
// ============================================================================

export const cssVarsLight = {
  "--bg-base": tokens.color.light.bg,
  "--bg-card": tokens.color.light.surface,
  "--bg-card-elevated": tokens.color.light.surfaceSubtle,
  "--bg-input": tokens.color.light.surface,
  "--border": tokens.color.light.border,
  "--border-focus": tokens.color.light.accent,
  "--border-strong": tokens.color.light.borderStrong,
  "--text-primary": tokens.color.light.text,
  "--text-secondary": tokens.color.light.textSecondary,
  "--text-muted": tokens.color.light.textMuted,
  "--accent": tokens.color.light.accent,
  "--accent-hover": tokens.color.light.accentHover,
  "--success": tokens.color.light.success,
  "--warning": tokens.color.light.warning,
  "--error": tokens.color.light.error,
  "--info": tokens.color.light.info,
} as const;

export const cssVarsDark = {
  "--bg-base": tokens.color.dark.bg,
  "--bg-card": tokens.color.dark.surface,
  "--bg-card-elevated": tokens.color.dark.surfaceMuted,
  "--bg-input": tokens.color.dark.surface,
  "--border": tokens.color.dark.border,
  "--border-focus": tokens.color.dark.accent,
  "--border-strong": tokens.color.dark.borderStrong,
  "--text-primary": tokens.color.dark.text,
  "--text-secondary": tokens.color.dark.textSecondary,
  "--text-muted": tokens.color.dark.textMuted,
  "--accent": tokens.color.dark.accent,
  "--accent-hover": tokens.color.dark.accentHover,
  "--success": tokens.color.dark.success,
  "--warning": tokens.color.dark.warning,
  "--error": tokens.color.dark.error,
  "--info": tokens.color.dark.info,
} as const;

// ============================================================================
// DS-4: generateGlobalCSS — produces the full :root + .dark CSS blocks
// ============================================================================

export function generateGlobalCSS(): string {
  const l = tokens.color.light;
  const d = tokens.color.dark;
  return `/* ── Design tokens — Kolekto · Verde Olivo ───────────────────── */
/* AUTO-GENERATED — run \`npm run tokens\` to regenerate           */
/* Source of truth: src/lib/design-tokens.ts                       */

:root {
  /* Backgrounds */
  --bg-base: ${l.bg};
  --bg-card: ${l.surface};
  --bg-card-elevated: ${l.surfaceSubtle};
  --bg-input: ${l.surface};
  --bg-sidebar: #1a1a1a; /* Tinta — always dark */
  --bg-sidebar-item: rgba(255, 255, 255, 0.05);
  --bg-sidebar-active: rgba(107, 122, 63, 0.15); /* Olivo 15% */

  /* Borders */
  --border: ${l.border};
  --border-focus: ${l.accent};
  --border-strong: ${l.borderStrong};

  /* Text */
  --text-primary: ${l.text};
  --text-secondary: ${l.textSecondary};
  --text-muted: ${l.textMuted};
  --text-on-dark: ${l.textInverse};
  --text-on-sidebar: ${l.surfaceMuted};
  --text-on-sidebar-active: #ffffff;

  /* Brand / Accent */
  --accent: ${l.accent};
  --accent-hover: ${l.accentHover};
  --accent-subtle: rgba(107, 122, 63, 0.1);
  --accent-foreground: #ffffff;

  /* Semantic */
  --success: ${l.success};
  --success-subtle: rgba(107, 122, 63, 0.1);
  --warning: ${l.warning};
  --warning-subtle: rgba(196, 154, 63, 0.1);
  --error: ${l.error};
  --error-subtle: rgba(160, 69, 64, 0.1);
  --info: ${l.info};
  --info-subtle: rgba(74, 107, 122, 0.1);

  /* POS-specific */
  --cart-bg: ${l.bg};
  --product-card-bg: ${l.surface};
  --payment-panel-bg: ${l.surfaceSubtle};
  --receipt-bg: ${l.surface};

  /* Typography */
  --font-sans: ${tokens.font.sans};
  --font-mono: ${tokens.font.mono};
  --font-receipt: "Courier Prime", "Courier New", monospace;

  /* Spacing */
  --radius: ${tokens.radius.md};
  --radius-sm: ${tokens.radius.sm};
  --radius-lg: ${tokens.radius.lg};

  /* Shadows */
  --shadow-card: ${tokens.shadow.sm};
  --shadow-elevated: ${tokens.shadow.md};
  --shadow-modal: ${tokens.shadow.lg};
}

.dark {
  --bg-base: ${d.bg};
  --bg-card: ${d.surface};
  --bg-card-elevated: ${d.surfaceMuted};
  --bg-input: ${d.surface};
  --bg-sidebar: ${d.bg};

  --border: ${d.border};
  --border-focus: ${d.accent};
  --border-strong: ${d.borderStrong};

  --text-primary: ${d.text};
  --text-secondary: ${d.textSecondary};
  --text-muted: ${d.textMuted};

  --accent: ${d.accent};
  --accent-hover: ${d.accentHover};
  --accent-subtle: rgba(164, 179, 100, 0.15);
  --accent-foreground: ${d.bg};

  --success: ${d.success};
  --success-subtle: rgba(164, 179, 100, 0.15);
  --warning: ${d.warning};
  --warning-subtle: rgba(212, 176, 95, 0.15);
  --error: ${d.error};
  --error-subtle: rgba(196, 101, 96, 0.15);
  --info: ${d.info};
  --info-subtle: rgba(122, 149, 164, 0.15);

  --cart-bg: ${d.bg};
  --product-card-bg: ${d.surface};
  --payment-panel-bg: ${d.surfaceMuted};
  --receipt-bg: ${d.surface};

  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-elevated: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-modal: 0 20px 60px rgba(0, 0, 0, 0.6);
}`;
}
