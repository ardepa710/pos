import { cn } from "@/lib/utils";
import { vendorColor } from "@/lib/vendor-color";

interface ProductThumbProps {
  url?: string | null;
  name: string;
  /** Seed for the fallback color (category/supplier id or sku). */
  seed: string;
  className?: string;
}

/**
 * Product image with a graceful fallback: when there's no thumbnail_url, shows
 * the product's initials on a vendor-color block (never a broken-image icon).
 */
export function ProductThumb({
  url,
  name,
  seed,
  className,
}: ProductThumbProps) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        loading="lazy"
        className={cn("object-cover", className)}
      />
    );
  }
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";
  return (
    <div
      aria-hidden
      className={cn(
        "flex items-center justify-center font-semibold text-white",
        className,
      )}
      style={{ background: vendorColor(seed) }}
    >
      {initials}
    </div>
  );
}
