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

// API Response types (mirrors backend schemas)
export interface UserRead {
  id: UUID;
  username: string;
  email: string;
  full_name: string;
  role: "admin" | "supervisor" | "cashier";
  must_change_password: boolean;
  theme_preference: "light" | "dark" | "system";
  is_active: boolean;
  created_at: ISODate;
}

export interface CategoryRead {
  id: UUID;
  name: string;
  description?: string;
  parent_id?: UUID;
  sort_order: number;
  is_active: boolean;
}

export interface ProductRead extends Product {
  id: UUID;
  category?: CategoryRead;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface ProductListResponse {
  items: ProductRead[];
  total: number;
  page: number;
  page_size: number;
}

export interface SaleItemRead {
  id: UUID;
  product_id: UUID;
  product_name_snapshot: string;
  product_sku_snapshot: string;
  quantity: Decimal;
  unit_price_mxn: Decimal;
  subtotal_mxn: Decimal;
  discount_mxn: Decimal;
  was_consigned: boolean;
}

export interface PaymentRead {
  id: UUID;
  method: PaymentMethod;
  amount_mxn: Decimal;
  amount_usd?: Decimal;
  terminal_reference?: string;
}

export interface SaleRead {
  id: UUID;
  folio: string;
  status: SaleStatus;
  customer_id?: UUID;
  customer_name?: string;
  cashier_session_id: UUID;
  subtotal_mxn: Decimal;
  discount_total_mxn: Decimal;
  tax_total_mxn: Decimal;
  total_mxn: Decimal;
  total_usd: Decimal;
  fx_rate_used: Decimal;
  items: SaleItemRead[];
  payments: PaymentRead[];
  created_at: ISODate;
}

export interface CashierSessionRead {
  id: UUID;
  status: "open" | "closed";
  starting_cash_mxn: Decimal;
  expected_cash_mxn: Decimal;
  physical_cash_mxn?: Decimal;
  difference_mxn?: Decimal;
  total_sales_mxn: Decimal;
  opened_at: ISODate;
  closed_at?: ISODate;
}

export interface CustomerRead {
  id: UUID;
  first_name: string;
  last_name: string;
  full_name: string;
  email?: string;
  phone?: string;
  rfc?: string;
  loyalty_points: number;
  is_active: boolean;
  created_at: ISODate;
}

export interface SupplierRead {
  id: UUID;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  is_active: boolean;
}

export interface PurchaseRead {
  id: UUID;
  folio: string;
  supplier_id: UUID;
  purchase_type: "normal" | "consignment_in";
  status: string;
  total_cost_mxn: Decimal;
  reference_number?: string;
  created_at: ISODate;
}

export interface GiftCardRead {
  id: UUID;
  code: string;
  initial_balance: Decimal;
  current_balance: Decimal;
  currency: string;
  status: "active" | "redeemed" | "expired" | "voided";
  expires_at?: ISODate;
  created_at: ISODate;
}

export interface ReturnRead {
  id: UUID;
  folio: string;
  original_sale_id: UUID;
  reason: string;
  total_returned_mxn: Decimal;
  refund_method: "cash" | "gift_card" | "store_credit";
  generated_gift_card_id?: UUID;
  created_at: ISODate;
}

export interface BusinessSettings {
  id: UUID;
  business_name: string;
  business_type: string;
  logo_url?: string;
  logo_small_url?: string;
  primary_color: string;
  secondary_color?: string;
  theme: "light" | "dark" | "system";
  wizard_completed: boolean;
  support_whatsapp?: string;
}

export interface DailySummary {
  date: ISODate;
  total_sales: number;
  total_revenue_mxn: Decimal;
  total_revenue_usd: Decimal;
  cash_total: Decimal;
  card_total: Decimal;
  gift_card_total: Decimal;
  top_products: Array<{ name: string; qty: Decimal; revenue: Decimal }>;
  cashier_sessions: Array<Record<string, unknown>>;
}

// Sale creation (frontend → API)
export interface SaleItemCreate {
  product_id: UUID;
  quantity: string; // Decimal as string
  unit_price_mxn: string;
  discount_mxn?: string;
  price_tier?: number; // 1-4
}

export interface PaymentCreate {
  method: PaymentMethod;
  amount_mxn: string;
  amount_usd?: string;
  terminal_reference?: string; // required for credit_card/debit_card
}

export interface SaleCreate {
  customer_id?: UUID;
  items: SaleItemCreate[];
  payments: PaymentCreate[];
  notes?: string;
}
