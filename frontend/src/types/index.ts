// Core domain types (mirrors backend schemas)

export type UUID = string;
export type ISODate = string;
export type Decimal = string; // comes as string from API to avoid float precision issues

export type PaymentMethod =
  | "cash_mxn"
  | "cash_usd"
  | "credit_card"
  | "debit_card"
  | "gift_card"
  | "loyalty_points"
  | "transfer";

export type SaleStatus = "draft" | "completed" | "cancelled" | "refunded";

export type BusinessType =
  | "general"
  | "clothing"
  | "jewelry"
  | "electronics"
  | "food"
  | "beauty"
  | "pharmacy"
  | "hardware"
  | "books"
  | "sports"
  | "toys"
  | "other";

export interface BrandingConfig {
  business_name: string;
  business_type: BusinessType;
  logo_url?: string;
  logo_small_url?: string;
  favicon_url?: string;
  primary_color: string;
  secondary_color?: string;
  font_family: string;
  theme: "light" | "dark" | "system";
}

export interface ExchangeRate {
  id: UUID;
  date: ISODate;
  usd_mxn: Decimal;
  source: "banxico" | "manual";
  created_at: ISODate;
}

export interface Product {
  id: UUID;
  sku: string;
  name: string;
  description?: string;
  category_id?: UUID;
  category_name?: string;
  price_general: Decimal;
  price_a?: Decimal;
  price_b?: Decimal;
  price_c?: Decimal;
  last_cost?: Decimal;
  stock: number;
  track_inventory: boolean;
  is_consignment: boolean;
  consigned_supplier_id?: UUID;
  attributes: Record<string, unknown>;
  is_active: boolean;
  image_url?: string;
}
