// Kolekto "punto de vendedor" identity palette (see DESIGN.md / design-tokens).
// Each product/vendor gets a stable color from this set, hashed from a seed.
const VENDOR_PALETTE = [
  "#6B7A3F", // Olivo
  "#8B6F4F", // Café
  "#A04540", // Tinto
  "#4A6B7A", // Azul piedra
  "#7A6B4F", // Marrón
  "#C49A3F", // Mostaza
  "#704830", // Tabaco
  "#3D4326", // Olivo profundo
  "#9C7B5C", // Arena tostada
] as const;

/** Deterministic color for a seed (category id, supplier id, sku…). */
export function vendorColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return VENDOR_PALETTE[h % VENDOR_PALETTE.length];
}
