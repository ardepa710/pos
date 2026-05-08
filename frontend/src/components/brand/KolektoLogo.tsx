import React from "react";

export interface KolektoLogoProps {
  variant?: "horizontal" | "isotipo" | "monocromo" | "inverso";
  size?: number; // height in px, default 40
  accentColor?: string;
  className?: string;
}

// Perimeter circle positions for the Kolekto isotipo
const PERIMETER_DOTS = [
  { cx: 0, cy: -26, isAccent: true }, // top — accent color
  { cx: 18.4, cy: -18.4, isAccent: false }, // top-right
  { cx: 26, cy: 0, isAccent: false }, // right
  { cx: 18.4, cy: 18.4, isAccent: false }, // bottom-right
  { cx: 0, cy: 26, isAccent: false }, // bottom
  { cx: -18.4, cy: 18.4, isAccent: false }, // bottom-left
  { cx: -26, cy: 0, isAccent: false }, // left
  { cx: -18.4, cy: -18.4, isAccent: false }, // top-left
] as const;

interface IsotipoProps {
  accentFill: string;
  inkFill: string;
  height: number;
}

function Isotipo({ accentFill, inkFill, height }: IsotipoProps) {
  return (
    <svg
      viewBox="-32 -32 64 64"
      height={height}
      width={height} // square — viewBox is 64x64
      aria-hidden="true"
      focusable="false"
    >
      {/* Perimeter dots */}
      {PERIMETER_DOTS.map((dot) => (
        <circle
          key={`${dot.cx}-${dot.cy}`}
          cx={dot.cx}
          cy={dot.cy}
          r={dot.isAccent ? 3.5 : 3.0}
          fill={dot.isAccent ? accentFill : inkFill}
        />
      ))}
      {/* Center nucleus */}
      <circle cx={0} cy={0} r={5.5} fill={inkFill} />
    </svg>
  );
}

export function KolektoLogo({
  variant = "horizontal",
  size = 40,
  accentColor,
  className,
}: KolektoLogoProps) {
  // Accent color resolution priority:
  // 1. accentColor prop if provided
  // 2. var(--accent) CSS variable (theme-aware default)
  const resolvedAccent = accentColor ?? "var(--accent)";

  if (variant === "isotipo") {
    return (
      <span
        className={className}
        style={{ display: "inline-flex", alignItems: "center" }}
      >
        <Isotipo
          accentFill={resolvedAccent}
          inkFill="currentColor"
          height={size}
        />
      </span>
    );
  }

  if (variant === "monocromo") {
    // All dots use currentColor — no olive accent
    return (
      <span
        className={className}
        style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
      >
        <Isotipo
          accentFill="currentColor"
          inkFill="currentColor"
          height={size}
        />
        <Wordmark height={size} />
      </span>
    );
  }

  if (variant === "inverso") {
    // Ink color is hueso (#F5F1EA), accent remains olive
    return (
      <span
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          color: "#F5F1EA",
        }}
      >
        <Isotipo accentFill={resolvedAccent} inkFill="#F5F1EA" height={size} />
        <Wordmark height={size} />
      </span>
    );
  }

  // Default: 'horizontal'
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
    >
      <Isotipo
        accentFill={resolvedAccent}
        inkFill="currentColor"
        height={size}
      />
      <Wordmark height={size} />
    </span>
  );
}

// Wordmark renders "Kolekto" sized to match the isotipo height
function Wordmark({ height }: { height: number }) {
  // Approximate font-size to visually match the isotipo height
  // The isotipo viewBox is 64 units tall; text cap-height is ~70% of font-size
  const fontSize = height * 0.72;

  return (
    <svg
      height={height}
      viewBox={`0 0 ${fontSize * 3.8} ${height}`}
      aria-label="Kolekto"
    >
      <text
        x={0}
        y={height * 0.76} // baseline alignment — cap-height sits within the isotipo height
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="500"
        fontSize={fontSize}
        letterSpacing="-0.01em"
        fill="currentColor"
      >
        Kolekto
      </text>
    </svg>
  );
}
