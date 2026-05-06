import { Decimal } from "decimal.js";

export function formatMXN(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatUSD(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(num);
}

export function usdToMxn(usdAmount: number, fxRate: number): number {
  return new Decimal(usdAmount)
    .mul(new Decimal(fxRate))
    .toDecimalPlaces(2)
    .toNumber();
}

export function mxnToUsd(mxnAmount: number, fxRate: number): number {
  if (fxRate === 0) return 0;
  return new Decimal(mxnAmount)
    .div(new Decimal(fxRate))
    .toDecimalPlaces(2)
    .toNumber();
}
