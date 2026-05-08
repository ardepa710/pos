import React from "react";

export interface VendorDotProps {
  vendorId: string;
  isActive?: boolean;
  size?: number; // default 8
  className?: string;
}

const vendorIdentityPalette = [
  "#6B7A3F",
  "#1A1A1A",
  "#8B6F4F",
  "#A04540",
  "#4A6B7A",
  "#7A6B4F",
  "#C49A3F",
  "#704830",
  "#3D4326",
  "#9C7B5C",
] as const;

const ACTIVE_COLOR = "#6B7A3F"; // olive — always used when isActive === true

function hashVendorId(vendorId: string): number {
  let sum = 0;
  for (let i = 0; i < vendorId.length; i++) {
    sum += vendorId.charCodeAt(i);
  }
  return sum;
}

export function VendorDot({
  vendorId,
  isActive,
  size = 8,
  className,
}: VendorDotProps) {
  const color =
    isActive === true
      ? ACTIVE_COLOR
      : vendorIdentityPalette[
          hashVendorId(vendorId) % vendorIdentityPalette.length
        ];

  return (
    <span
      className={className}
      title={vendorId}
      style={{
        display: "inline-block",
        borderRadius: "9999px",
        width: size,
        height: size,
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
  );
}
