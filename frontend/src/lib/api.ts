// API client — all backend endpoints

// Re-export all domain types from the single source of truth
export type {
  UUID,
  ISODate,
  Decimal,
  BrandingConfig,
  PaymentMethod,
  SaleStatus,
  UserRead,
  CategoryRead,
  ProductRead,
  ProductListResponse,
  SaleItemRead,
  PaymentRead,
  SaleRead,
  SaleItemCreate,
  PaymentCreate,
  SaleCreate,
  CashierSessionRead,
  CustomerRead,
  SupplierRead,
  PurchaseItemRead,
  PurchaseRead,
  GiftCardRead,
  ReturnRead,
  BusinessSettings,
  DailySummary,
} from "@/types/index";

// Alias for backwards compatibility with components that use the old names
export type {
  PaymentRead as SalePaymentRead,
  PaymentCreate as SalePaymentCreate,
} from "@/types/index";

import type {
  UUID,
  ISODate,
  Decimal,
  BrandingConfig,
  UserRead,
  CategoryRead,
  ProductRead,
  ProductListResponse,
  SaleRead,
  SaleCreate,
  CashierSessionRead,
  CustomerRead,
  SupplierRead,
  PurchaseRead,
  GiftCardRead,
  ReturnRead,
  BusinessSettings,
  DailySummary,
} from "@/types/index";

// ── Request / mutation types (API-layer only) ─────────────────────────────

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
  stock_quantity?: string;
  track_inventory?: boolean;
  is_consigned?: boolean;
  consigned_supplier_id?: UUID;
  attributes?: Record<string, unknown>;
  is_active?: boolean;
  thumbnail_url?: string;
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
    // Only auto-redirect on 401 for authenticated (token-bearing) requests.
    // Unauthenticated requests (e.g. login) should let the error propagate
    // to the caller so the form can display "wrong credentials".
    if (token) {
      const { useAuthStore } = await import("@/store/auth");
      useAuthStore.getState().clearAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Sesión expirada. Por favor inicia sesión nuevamente.");
    }
  }

  if (!res.ok) {
    let errorMessage = `Error ${res.status}`;
    try {
      const body = await res.json();
      const detail = body?.detail ?? body?.message;
      if (Array.isArray(detail)) {
        // FastAPI 422 validation errors: [{loc, msg, type}, ...]
        errorMessage = detail
          .map((e: { msg?: string; loc?: string[] }) => {
            const field = e.loc ? e.loc[e.loc.length - 1] : "";
            return field
              ? `${field}: ${e.msg}`
              : (e.msg ?? "Error de validación");
          })
          .join(" | ");
      } else if (typeof detail === "string") {
        errorMessage = detail;
      }
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

  printReceipt: (token: string, saleId: string) =>
    apiFetch<{ status: string; printer: string }>(`/v1/sales/${saleId}/print`, {
      method: "POST",
      token,
    }),
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

  getPrinters: (token: string) =>
    apiFetch<{ printers: string[]; available: boolean; message?: string }>(
      "/v1/settings/printers",
      { token },
    ),
};

// ── Users ─────────────────────────────────────────────────────────────────

export interface UserCreate {
  username: string;
  full_name: string;
  email: string;
  role: "admin" | "supervisor" | "cashier";
  password: string;
  is_active?: boolean;
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
