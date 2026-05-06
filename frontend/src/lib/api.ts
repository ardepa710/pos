// API client — all backend endpoints
// Types that mirror backend response schemas

import type {
  UUID,
  ISODate,
  Decimal,
  BrandingConfig,
  GiftCardRead,
  ReturnRead,
} from "@/types/index";
export type { GiftCardRead, ReturnRead };

// ── Response types ────────────────────────────────────────────────────────

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
  product_count?: number;
  created_at: ISODate;
}

export interface ProductRead {
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
  created_at: ISODate;
  updated_at: ISODate;
}

export interface ProductListResponse {
  items: ProductRead[];
  total: number;
  skip: number;
  limit: number;
}

export interface ProductCreate {
  sku: string;
  name: string;
  description?: string;
  category_id?: UUID;
  price_general: Decimal;
  price_a?: Decimal;
  price_b?: Decimal;
  price_c?: Decimal;
  last_cost?: Decimal;
  stock?: number;
  track_inventory?: boolean;
  is_consignment?: boolean;
  consigned_supplier_id?: UUID;
  attributes?: Record<string, unknown>;
  is_active?: boolean;
  image_url?: string;
}

export interface SaleItemRead {
  id: UUID;
  product_id: UUID;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: Decimal;
  discount_pct: Decimal;
  subtotal: Decimal;
  is_consignment: boolean;
}

export interface SalePaymentRead {
  id: UUID;
  method: string;
  amount: Decimal;
  currency: string;
  terminal_reference?: string;
}

export interface SaleRead {
  id: UUID;
  folio: string;
  status: "draft" | "completed" | "cancelled" | "refunded";
  customer_id?: UUID;
  customer_name?: string;
  cashier_id: UUID;
  cashier_name: string;
  session_id: UUID;
  items: SaleItemRead[];
  payments: SalePaymentRead[];
  subtotal: Decimal;
  tax_amount: Decimal;
  discount_amount: Decimal;
  total_mxn: Decimal;
  change_mxn: Decimal;
  notes?: string;
  voided_reason?: string;
  created_at: ISODate;
  completed_at?: ISODate;
}

export interface SaleItemCreate {
  product_id: UUID;
  quantity: number;
  unit_price: Decimal;
  discount_pct?: Decimal;
}

export interface SalePaymentCreate {
  method: string;
  amount: Decimal;
  currency?: string;
  terminal_reference?: string;
}

export interface SaleCreate {
  customer_id?: UUID;
  items: SaleItemCreate[];
  payments: SalePaymentCreate[];
  notes?: string;
}

export interface CashierSessionRead {
  id: UUID;
  cashier_id: UUID;
  cashier_name: string;
  status: "open" | "closed";
  starting_cash_mxn: Decimal;
  physical_cash_mxn?: Decimal;
  expected_cash_mxn?: Decimal;
  cash_difference_mxn?: Decimal;
  total_sales_mxn?: Decimal;
  sale_count?: number;
  opened_at: ISODate;
  closed_at?: ISODate;
}

export interface CustomerRead {
  id: UUID;
  name: string;
  email?: string;
  phone?: string;
  rfc?: string;
  address?: string;
  loyalty_points: number;
  notes?: string;
  is_active: boolean;
  created_at: ISODate;
}

export interface SupplierRead {
  id: UUID;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  is_active: boolean;
  created_at: ISODate;
}

// GiftCardRead and ReturnRead are imported from @/types/index and re-exported above

export interface PurchaseRead {
  id: UUID;
  supplier_id: UUID;
  supplier_name: string;
  cashier_id: UUID;
  items: Array<{
    product_id: UUID;
    product_name: string;
    quantity: number;
    unit_cost: Decimal;
    subtotal: Decimal;
  }>;
  total: Decimal;
  notes?: string;
  created_at: ISODate;
}

export interface DailySummary {
  date: string;
  total_sales_mxn: Decimal;
  total_returns_mxn: Decimal;
  net_mxn: Decimal;
  sale_count: number;
  return_count: number;
  payment_breakdown: Record<string, Decimal>;
  top_products: Array<{
    product_id: UUID;
    product_name: string;
    quantity: number;
    total_mxn: Decimal;
  }>;
}

export interface BusinessSettings {
  business_name: string;
  business_type: string;
  rfc?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  receipt_footer?: string;
  tax_rate: Decimal;
  currency: string;
  accept_usd: boolean;
  support_whatsapp?: string;
  theme?: "light" | "dark" | "system";
  wizard_completed: boolean;
}

// ── Core ──────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (res.status === 401) {
    // Clear auth state and redirect to login — import store directly (not hook)
    const { useAuthStore } = await import("@/store/auth");
    useAuthStore.getState().clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Sesión expirada. Por favor inicia sesión nuevamente.");
  }

  if (!res.ok) {
    let errorMessage = `Error ${res.status}`;
    try {
      const body = await res.json();
      errorMessage = body?.detail ?? body?.message ?? errorMessage;
    } catch {
      // Response body was not JSON — keep default message
    }
    throw new Error(errorMessage);
  }

  // 204 No Content — return undefined cast as T
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// ── Helper ────────────────────────────────────────────────────────────────

function toQuery(params?: Record<string, unknown> | object): string {
  if (!params) return "";
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) p.set(k, String(v));
  });
  return p.size ? `?${p.toString()}` : "";
}

// ── Auth ──────────────────────────────────────────────────────────────────

export const authApi = {
  login: (username: string, password: string) =>
    apiFetch<{ access_token: string; token_type: string; user: UserRead }>(
      "/v1/auth/login",
      {
        method: "POST",
        body: new URLSearchParams({ username, password }).toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    ),

  me: (token: string) => apiFetch<UserRead>("/v1/auth/me", { token }),

  changePassword: (token: string, current: string, newPass: string) =>
    apiFetch<{ ok: boolean }>("/v1/auth/change-password", {
      method: "POST",
      token,
      body: JSON.stringify({
        current_password: current,
        new_password: newPass,
      }),
    }),
};

// ── Products ──────────────────────────────────────────────────────────────

export const productsApi = {
  list: (
    token: string,
    params?: {
      search?: string;
      category_id?: string;
      skip?: number;
      limit?: number;
    },
  ) =>
    apiFetch<ProductListResponse>(`/v1/products${toQuery(params)}`, { token }),

  get: (token: string, id: string) =>
    apiFetch<ProductRead>(`/v1/products/${id}`, { token }),

  create: (token: string, data: ProductCreate) =>
    apiFetch<ProductRead>("/v1/products", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: Partial<ProductCreate>) =>
    apiFetch<ProductRead>(`/v1/products/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    apiFetch<void>(`/v1/products/${id}`, { method: "DELETE", token }),
};

// ── Categories ────────────────────────────────────────────────────────────

export const categoriesApi = {
  list: (token: string) =>
    apiFetch<CategoryRead[]>("/v1/categories", { token }),

  create: (token: string, data: { name: string; description?: string }) =>
    apiFetch<CategoryRead>("/v1/categories", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: object) =>
    apiFetch<CategoryRead>(`/v1/categories/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    apiFetch<void>(`/v1/categories/${id}`, { method: "DELETE", token }),
};

// ── Sales ─────────────────────────────────────────────────────────────────

export const salesApi = {
  create: (token: string, data: SaleCreate) =>
    apiFetch<SaleRead>("/v1/sales", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  list: (token: string, params?: object) =>
    apiFetch<SaleRead[]>(`/v1/sales${toQuery(params)}`, { token }),

  get: (token: string, id: string) =>
    apiFetch<SaleRead>(`/v1/sales/${id}`, { token }),

  void: (token: string, id: string, reason: string) =>
    apiFetch<SaleRead>(`/v1/sales/${id}/void`, {
      method: "POST",
      token,
      body: JSON.stringify({ reason }),
    }),

  openSession: (token: string, starting_cash_mxn: string) =>
    apiFetch<CashierSessionRead>("/v1/sales/sessions/open", {
      method: "POST",
      token,
      body: JSON.stringify({ starting_cash_mxn }),
    }),

  closeSession: (token: string, physical_cash_mxn: string) =>
    apiFetch<CashierSessionRead>("/v1/sales/sessions/close", {
      method: "POST",
      token,
      body: JSON.stringify({ physical_cash_mxn }),
    }),

  currentSession: (token: string) =>
    apiFetch<CashierSessionRead | null>("/v1/sales/sessions/current", {
      token,
    }),

  fxRate: (token: string) =>
    apiFetch<{ rate: string; pair: string; date: string }>(
      "/v1/sales/fx-rate",
      { token },
    ),
};

// ── Customers ─────────────────────────────────────────────────────────────

export const customersApi = {
  list: (
    token: string,
    params?: { search?: string; skip?: number; limit?: number },
  ) => apiFetch<CustomerRead[]>(`/v1/customers${toQuery(params)}`, { token }),

  get: (token: string, id: string) =>
    apiFetch<CustomerRead>(`/v1/customers/${id}`, { token }),

  create: (token: string, data: object) =>
    apiFetch<CustomerRead>("/v1/customers", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: object) =>
    apiFetch<CustomerRead>(`/v1/customers/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),
};

// ── Suppliers ─────────────────────────────────────────────────────────────

export const suppliersApi = {
  list: (token: string) => apiFetch<SupplierRead[]>("/v1/suppliers", { token }),

  create: (token: string, data: object) =>
    apiFetch<SupplierRead>("/v1/suppliers", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: object) =>
    apiFetch<SupplierRead>(`/v1/suppliers/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),
};

// ── Gift Cards ────────────────────────────────────────────────────────────

export const giftCardsApi = {
  issue: (
    token: string,
    data: { initial_balance: string; currency?: string },
  ) =>
    apiFetch<GiftCardRead>("/v1/gift-cards", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  lookup: (token: string, code: string) =>
    apiFetch<GiftCardRead>(`/v1/gift-cards/${code}`, { token }),

  redeem: (token: string, code: string, amount: string) =>
    apiFetch<GiftCardRead>(`/v1/gift-cards/${code}/redeem`, {
      method: "POST",
      token,
      body: JSON.stringify({ code, amount }),
    }),
};

// ── Returns ───────────────────────────────────────────────────────────────

export const returnsApi = {
  create: (token: string, data: object) =>
    apiFetch<ReturnRead>("/v1/returns", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  list: (token: string, params?: { original_sale_id?: string }) =>
    apiFetch<ReturnRead[]>(`/v1/returns${toQuery(params)}`, { token }),
};

// ── Purchases ─────────────────────────────────────────────────────────────

export const purchasesApi = {
  list: (token: string, params?: object) =>
    apiFetch<PurchaseRead[]>(`/v1/purchases${toQuery(params)}`, { token }),

  create: (token: string, data: object) =>
    apiFetch<PurchaseRead>("/v1/purchases", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  consignmentIn: (token: string, data: object) =>
    apiFetch<PurchaseRead>("/v1/purchases/consignments/in", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  settle: (token: string, data: object) =>
    apiFetch<object>("/v1/purchases/consignments/settle", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  listConsignments: (token: string, params?: object) =>
    apiFetch<PurchaseRead[]>(`/v1/purchases/consignments${toQuery(params)}`, {
      token,
    }),
};

// ── Reports ───────────────────────────────────────────────────────────────

export const reportsApi = {
  daily: (token: string, date?: string) =>
    apiFetch<DailySummary>(`/v1/reports/daily${date ? `?date=${date}` : ""}`, {
      token,
    }),

  // Returns a URL string for direct browser download (PDF)
  salesPdfUrl: (_token: string, params: object) =>
    `${API_BASE}/v1/reports/sales/pdf${toQuery(params)}`,

  inventoryPdfUrl: (_token: string) => `${API_BASE}/v1/reports/inventory/pdf`,
};

// ── Settings ──────────────────────────────────────────────────────────────

export const settingsApi = {
  getBusiness: (token: string) =>
    apiFetch<BusinessSettings>("/v1/settings/business", { token }),

  updateBusiness: (token: string, data: object) =>
    apiFetch<BusinessSettings>("/v1/settings/business", {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  completeWizard: (token: string) =>
    apiFetch<BusinessSettings>("/v1/settings/wizard/complete", {
      method: "POST",
      token,
    }),
};

// ── Users ─────────────────────────────────────────────────────────────────

export interface UserCreate {
  username: string;
  full_name: string;
  email: string;
  role: "admin" | "supervisor" | "cashier";
  password: string;
}

export interface UserUpdate {
  full_name?: string;
  email?: string;
  role?: "admin" | "supervisor" | "cashier";
  is_active?: boolean;
  password?: string;
}

export const usersApi = {
  list: (token: string) => apiFetch<UserRead[]>("/v1/users", { token }),

  get: (token: string, id: string) =>
    apiFetch<UserRead>(`/v1/users/${id}`, { token }),

  create: (token: string, data: UserCreate) =>
    apiFetch<UserRead>("/v1/users", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  update: (token: string, id: string, data: UserUpdate) =>
    apiFetch<UserRead>(`/v1/users/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),

  delete: (token: string, id: string) =>
    apiFetch<void>(`/v1/users/${id}`, { method: "DELETE", token }),
};

// ── Branding (unauthenticated) ────────────────────────────────────────────

export async function fetchBranding(): Promise<BrandingConfig | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/branding`);
    if (!res.ok) return null;
    return res.json() as Promise<BrandingConfig>;
  } catch {
    return null;
  }
}
