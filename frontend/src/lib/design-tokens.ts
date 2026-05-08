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
// CSS VARIABLES EXPORT (para inyección en :root)
// ============================================================================
export const cssVariablesLight = `
  --color-bg: ${tokens.color.light.bg};
  --color-surface: ${tokens.color.light.surface};
  --color-surface-muted: ${tokens.color.light.surfaceMuted};
  --color-surface-subtle: ${tokens.color.light.surfaceSubtle};
  --color-text: ${tokens.color.light.text};
  --color-text-secondary: ${tokens.color.light.textSecondary};
  --color-text-muted: ${tokens.color.light.textMuted};
  --color-text-inverse: ${tokens.color.light.textInverse};
  --color-accent: ${tokens.color.light.accent};
  --color-accent-hover: ${tokens.color.light.accentHover};
  --color-accent-subtle: ${tokens.color.light.accentSubtle};
  --color-border: ${tokens.color.light.border};
  --color-border-strong: ${tokens.color.light.borderStrong};
  --color-border-subtle: ${tokens.color.light.borderSubtle};
  --color-success: ${tokens.color.light.success};
  --color-warning: ${tokens.color.light.warning};
  --color-error: ${tokens.color.light.error};
  --color-info: ${tokens.color.light.info};
  --font-sans: ${tokens.font.sans};
  --font-mono: ${tokens.font.mono};
`;

export const cssVariablesDark = `
  --color-bg: ${tokens.color.dark.bg};
  --color-surface: ${tokens.color.dark.surface};
  --color-surface-muted: ${tokens.color.dark.surfaceMuted};
  --color-surface-subtle: ${tokens.color.dark.surfaceSubtle};
  --color-text: ${tokens.color.dark.text};
  --color-text-secondary: ${tokens.color.dark.textSecondary};
  --color-text-muted: ${tokens.color.dark.textMuted};
  --color-text-inverse: ${tokens.color.dark.textInverse};
  --color-accent: ${tokens.color.dark.accent};
  --color-accent-hover: ${tokens.color.dark.accentHover};
  --color-accent-subtle: ${tokens.color.dark.accentSubtle};
  --color-border: ${tokens.color.dark.border};
  --color-border-strong: ${tokens.color.dark.borderStrong};
  --color-border-subtle: ${tokens.color.dark.borderSubtle};
  --color-success: ${tokens.color.dark.success};
  --color-warning: ${tokens.color.dark.warning};
  --color-error: ${tokens.color.dark.error};
  --color-info: ${tokens.color.dark.info};
`;
