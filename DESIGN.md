---
name: Kolekto
description: POS cálido y artesanal para comercios pequeños de México — verde olivo, tinta y hueso.
colors:
  hueso: "#F5F1EA"
  surface: "#FFFFFF"
  arena: "#E8E2D5"
  verde-lavado: "#F0F0E5"
  tinta: "#1A1A1A"
  olivo-oscuro: "#3D4326"
  piedra: "#8C8478"
  olivo: "#6B7A3F"
  olivo-hover: "#5A6835"
  olivo-claro: "#A4B364"
  border: "#E8E2D5"
  border-strong: "#D8D2C4"
  mostaza: "#C49A3F"
  tinto: "#A04540"
  azul-piedra: "#4A6B7A"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 500
    lineHeight: "3.25rem"
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 500
    lineHeight: "2.25rem"
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 500
    lineHeight: "1.875rem"
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.375rem"
    letterSpacing: "0"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: "1rem"
    letterSpacing: "0.02em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.375rem"
    letterSpacing: "0"
rounded:
  sm: "4px"
  md: "6px"
  lg: "10px"
  xl: "14px"
  "2xl": "20px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.olivo}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 16px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.olivo-hover}"
    textColor: "{colors.surface}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.olivo-oscuro}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 16px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.tinto}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    typography: "{typography.body}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: Kolekto

## 1. Overview

**Creative North Star: "El Mercado de Confianza"**

Kolekto se ve como un puesto de mercado bien llevado: cálido, local y ordenado, donde cada vendedor tiene su lugar y los números siempre cuadran. La superficie es papel hueso (#F5F1EA), no blanco de oficina; el texto es tinta (#1A1A1A); el único acento es el verde olivo (#6B7A3F), y se gana su lugar. La densidad es de herramienta de trabajo —compacta, legible bajo cualquier luz de mostrador— pero la temperatura es humana, no corporativa. Es una app para manos ocupadas que cobran de pie frente a un cliente.

El sistema rechaza explícitamente cuatro cosas (de PRODUCT.md): el **SaaS genérico** (cards azules, gradientes morados, eyebrows en mayúsculas), el **POS corporativo frío** estilo Square/Clover/Toast (gris, sin alma, sin raíz local), lo **recargado/colorido** (badges por todas partes, ruido), y lo **anticuado** (tablas densas estilo Windows XP sin jerarquía). La calidez vive en el color, la tipografía y el ritmo del espaciado — nunca en decoración.

**Key Characteristics:**

- Superficie hueso cálida, no blanco clínico; tinta para texto, no gris suave.
- Un solo acento (olivo), usado con disciplina (≤10% de cualquier pantalla).
- Densidad de herramienta de trabajo: escala de 4px, controles compactos, áreas de toque generosas.
- Identidad de vendedor por color: cada colaborador del colectivo tiene su "punto".
- es-MX nativo en toda la UI; los números son tabulares y nunca mienten.

## 2. Colors

Una paleta terrosa y contenida: hueso y arena como tierra, tinta como texto, olivo como la única voz de acento, y un cuarteto semántico cálido (olivo/mostaza/tinto/azul-piedra) que evita los rojos y verdes de semáforo.

### Primary

- **Olivo** (#6B7A3F): la única voz de acento. CTAs primarios, estado activo, foco, indicador del vendedor activo. En hover baja a **Olivo presionado** (#5A6835). **Olivo claro** (#A4B364) es para dark mode y estados disabled, nunca para texto en light.

### Secondary

- **Tinta** (#1A1A1A): texto principal y el fondo del sidebar (siempre oscuro). Es el ancla seria del sistema.
- **Olivo oscuro** (#3D4326): texto secundario que acompaña al acento sin gritar.

### Tertiary

- **Mostaza** (#C49A3F): advertencia. **Tinto** (#A04540): error/destructivo. **Azul piedra** (#4A6B7A): información. Success reutiliza **Olivo** — el verde de éxito ES el acento de marca.

### Neutral

- **Hueso** (#F5F1EA): fondo principal de la app y del carrito.
- **Blanco** (#FFFFFF): superficie de cards, modales, menús e inputs.
- **Arena** (#E8E2D5): hover, secciones secundarias, y el borde estándar.
- **Verde lavado** (#F0F0E5): pills y badges suaves, panel de pago.
- **Piedra** (#8C8478): captions, timestamps, helpers. Es el muted más claro permitido para texto — nunca para body largo.
- **Borde fuerte** (#D8D2C4): inputs y divisores marcados.

### Named Rules

**La Regla del Olivo Disciplinado.** El olivo es el acento, no la decoración. Vive en ≤10% de cualquier pantalla: CTA primario, estado activo, foco, punto de vendedor. **Prohibido** usar olivo para texto largo, fondos de párrafo o fondos de card. Su rareza es lo que lo hace significar.

**La Regla del Punto de Vendedor.** En un colectivo, cada vendedor tiene un color de identidad de una paleta fija de 10 (tinta, café, tinto, azul piedra, marrón, mostaza, tabaco, olivo profundo, arena tostada). El vendedor **activo** siempre se renderea en olivo. El color identifica, no decora.

**La Regla del Color Semántico Acompañado.** El color de estado (éxito/advertencia/error) nunca es el único portador de significado — siempre va con ícono o texto, por WCAG AA y daltonismo.

## 3. Typography

**Display / Body Font:** Inter (con `system-ui, -apple-system, sans-serif`)
**Mono Font:** JetBrains Mono (números, folios, montos en tablas)
**Receipt Font:** Courier Prime (solo el ticket impreso/preview)

**Character:** Una sola familia humanista (Inter) en tres pesos —400 regular, 500 medium, 600 semibold puntual— hace todo el trabajo. Sin pares de fuentes que compitan; la jerarquía es de tamaño y peso, no de familia. El mono aparece solo donde los dígitos deben alinearse.

### Hierarchy

- **Display** (500, 3rem/48px, lh 3.25rem, ls -0.035em): títulos de pantalla grandes, raros. Letter-spacing nunca más apretado que -0.04em.
- **Headline** (500, 1.75rem/28px, ls -0.025em): encabezados de sección.
- **Title** (500, 1.375rem/22px, ls -0.015em): títulos de card, modal headers.
- **Body** (400, 0.875rem/14px, lh 1.375rem): el texto de trabajo. Máximo 65–75ch en prosa.
- **Label** (500, 0.6875rem/11px, ls 0.02em): captions, helpers, metadatos.
- **Mono** (400, 0.875rem/14px, `tabular-nums`): montos, folios, cantidades en tablas y panel de pago.

### Named Rules

**La Regla de los Dígitos Tabulares.** Todo monto, saldo o cantidad usa `tabular-nums` (y a menudo JetBrains Mono) para que las columnas de dinero se alineen. El dinero nunca baila.

## 4. Elevation

Sistema en **capas con sombra suave**, pero el borde hace la mayor parte del trabajo. Las superficies en reposo se separan por borde arena (#E8E2D5) sobre el fondo hueso; las sombras son sutiles y dan jerarquía de profundidad sin dramatismo. Nunca sombras oscuras ni desenfoques grandes — eso lee como app de 2014.

### Shadow Vocabulary

- **Card** (`box-shadow: 0 1px 2px 0 rgb(26 26 26 / 0.04)`): elevación de reposo apenas perceptible en cards sobre hueso.
- **Elevated** (`0 2px 8px -2px rgb(26 26 26 / 0.06), 0 1px 4px -1px rgb(26 26 26 / 0.04)`): popovers, menús, cards en hover.
- **Modal** (`0 8px 24px -8px rgb(26 26 26 / 0.10), 0 4px 8px -4px rgb(26 26 26 / 0.06)`): diálogos y modales sobre el backdrop atenuado.

### Named Rules

**La Regla del Borde Primero.** Ante la duda entre sombra y borde, gana el borde. La sombra se reserva para lo que de verdad flota (menús, modales). Una card sobre la lista usa borde + sombra `card` casi invisible, nunca una sombra ancha y oscura.

## 5. Components

Componentes **táctiles y honestos**: el control responde a la presión, muestra foco claro, y no presume con decoración. Toda interacción usa `transition-colors` + `transition-transform` (propiedades específicas, nunca `transition-all`).

### Buttons

- **Shape:** esquinas de 6px (`rounded-md`); el tamaño `lg` sube a 10px (`rounded-lg`).
- **Tamaños:** sm (alto 32px, texto 11px), md (alto 36px, texto 14px), lg (alto 40px, texto 14px).
- **Primary:** fondo olivo (#6B7A3F), texto blanco; hover → olivo presionado (#5A6835).
- **Press feedback:** `active:scale-[0.96]` en todos; `disabled:active:scale-100` cancela el efecto deshabilitado.
- **Focus:** `focus-visible` con outline de 2px en olivo, offset 2px. Siempre visible por teclado.
- **Ghost / Outline / Danger:** ghost = transparente + texto olivo oscuro, hover fondo elevado; outline = borde arena; danger = texto tinto, hover fondo tinto + texto blanco.

### Inputs / Fields

- **Style:** fondo blanco, borde arena (#E8E2D5), esquinas 6px, padding 8px/12px, texto 14px.
- **Focus:** cambio de borde a olivo (#6B7A3F) — un shift de color sólido, **no un glow**.
- **Error:** borde tinto (#A04540), que se mantiene en focus. Placeholder en piedra (#8C8478), nunca más claro (contraste AA).

### Cards / Containers

- **Corner Style:** 10px (`rounded-lg`); contenedores grandes 14px; modales 20px.
- **Background:** blanco (#FFFFFF) sobre fondo hueso.
- **Shadow Strategy:** ver Elevation — borde arena + sombra `card` casi invisible en reposo.
- **Border:** #E8E2D5 estándar. Nunca anidar cards.

### Navigation (Sidebar)

- **Style:** sidebar siempre tinta (#1A1A1A), texto crema. Ítem activo: fondo olivo al 15% + texto blanco. Filtrado por rol (cajero/supervisor/admin). El indicador activo hoy usa un borde-izquierdo de 3px; preferir un indicador de fondo pleno o una barra a sangre completa (el side-stripe de 1px+ está en los Don'ts).

### Vendor Identity Dot (signature)

Punto de color que identifica al vendedor en listados y ventas. Activo = olivo; el resto rota en la paleta fija de 10. Es la firma de Kolekto: vuelve visible quién es quién en un colectivo.

## 6. Do's and Don'ts

### Do:

- **Do** usar olivo (#6B7A3F) solo para CTA primario, estado activo, foco y punto de vendedor — ≤10% de la pantalla.
- **Do** poner todo monto/cantidad en `tabular-nums` (JetBrains Mono donde alinee columnas).
- **Do** separar superficies con borde arena (#E8E2D5) antes que con sombra.
- **Do** dar `active:scale-[0.96]` y `focus-visible` outline a todo control interactivo (especialmente los de alta frecuencia del POS).
- **Do** acompañar todo color semántico con ícono o texto (WCAG AA, daltonismo).
- **Do** mantener `letter-spacing ≥ -0.04em` en display.

### Don't:

- **Don't** parecer **SaaS genérico**: nada de cards azules, gradientes morados, `background-clip: text`, ni eyebrows en mayúsculas tracked sobre cada sección.
- **Don't** parecer **POS corporativo frío** (Square/Clover/Toast): nada de gris neutro sin raíz local; el hueso y el olivo son la identidad.
- **Don't** caer en lo **recargado/colorido**: badges por todas partes, múltiples acentos compitiendo, ruido visual.
- **Don't** parecer **anticuado**: tablas densas sin jerarquía, formularios interminables, sombras oscuras estilo 2014.
- **Don't** usar olivo para texto largo, fondos de párrafo o fondos de card.
- **Don't** redondear cards por encima de 16px ni emparejar `border 1px` con `box-shadow` ancho (≥16px blur) como decoración.
- **Don't** usar gris claro para body "por elegancia" — baja el contraste; el texto es tinta.
