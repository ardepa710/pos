"use client";

import { create } from "zustand";
import Decimal from "decimal.js";
import type { ProductRead } from "@/lib/api";

export interface CartItem {
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price_mxn: string; // Decimal string
  price_tier: 1 | 2 | 3 | 4;
  discount_mxn: string; // Decimal string
  subtotal_mxn: string; // computed: quantity * price - discount
  track_inventory: boolean;
  stock: number;
}

function computeSubtotal(
  quantity: number,
  unit_price_mxn: string,
  discount_mxn: string,
): string {
  const gross = new Decimal(unit_price_mxn).mul(quantity);
  const disc = new Decimal(discount_mxn);
  const result = gross.sub(disc);
  return result.lessThan(0) ? "0.00" : result.toFixed(2);
}

function getPriceTierPrice(product: ProductRead, tier: 1 | 2 | 3 | 4): string {
  switch (tier) {
    case 2:
      return product.price_a ?? product.price_general;
    case 3:
      return product.price_b ?? product.price_general;
    case 4:
      return product.price_c ?? product.price_general;
    default:
      return product.price_general;
  }
}

interface CartState {
  items: CartItem[];
  customer_id: string | null;
  customer_name: string | null;
  notes: string;

  // Actions
  addItem: (product: ProductRead, quantity?: number) => void;
  updateQuantity: (product_id: string, quantity: number) => void;
  updateDiscount: (product_id: string, discount_mxn: string) => void;
  updatePriceTier: (product_id: string, tier: 1 | 2 | 3 | 4) => void;
  removeItem: (product_id: string) => void;
  setCustomer: (id: string | null, name: string | null) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;

  // Computed getters
  subtotal_mxn: () => string;
  total_mxn: () => string;
  itemCount: () => number;
}

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  customer_id: null,
  customer_name: null,
  notes: "",

  addItem: (product: ProductRead, quantity = 1) => {
    set((state) => {
      const existing = state.items.find((i) => i.product_id === product.id);
      if (existing) {
        // Increment quantity
        const newQty = existing.quantity + quantity;
        return {
          items: state.items.map((i) =>
            i.product_id === product.id
              ? {
                  ...i,
                  quantity: newQty,
                  subtotal_mxn: computeSubtotal(
                    newQty,
                    i.unit_price_mxn,
                    i.discount_mxn,
                  ),
                }
              : i,
          ),
        };
      }
      // New item
      const unit_price_mxn = product.price_general;
      const discount_mxn = "0.00";
      return {
        items: [
          ...state.items,
          {
            product_id: product.id,
            product_name: product.name,
            product_sku: product.sku,
            quantity,
            unit_price_mxn,
            price_tier: 1 as const,
            discount_mxn,
            subtotal_mxn: computeSubtotal(
              quantity,
              unit_price_mxn,
              discount_mxn,
            ),
            track_inventory: product.track_inventory,
            stock: product.stock,
          },
        ],
      };
    });
  },

  updateQuantity: (product_id: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(product_id);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.product_id === product_id
          ? {
              ...i,
              quantity,
              subtotal_mxn: computeSubtotal(
                quantity,
                i.unit_price_mxn,
                i.discount_mxn,
              ),
            }
          : i,
      ),
    }));
  },

  updateDiscount: (product_id: string, discount_mxn: string) => {
    set((state) => ({
      items: state.items.map((i) => {
        if (i.product_id !== product_id) return i;
        const safeDiscount = isNaN(parseFloat(discount_mxn))
          ? "0.00"
          : discount_mxn;
        return {
          ...i,
          discount_mxn: safeDiscount,
          subtotal_mxn: computeSubtotal(
            i.quantity,
            i.unit_price_mxn,
            safeDiscount,
          ),
        };
      }),
    }));
  },

  updatePriceTier: (product_id: string, tier: 1 | 2 | 3 | 4) => {
    // Price tier update requires knowing product prices — handled at component level
    // by passing the new unit_price_mxn
    set((state) => ({
      items: state.items.map((i) =>
        i.product_id === product_id ? { ...i, price_tier: tier } : i,
      ),
    }));
  },

  removeItem: (product_id: string) => {
    set((state) => ({
      items: state.items.filter((i) => i.product_id !== product_id),
    }));
  },

  setCustomer: (id: string | null, name: string | null) => {
    set({ customer_id: id, customer_name: name });
  },

  setNotes: (notes: string) => {
    set({ notes });
  },

  clearCart: () => {
    set({
      items: [],
      customer_id: null,
      customer_name: null,
      notes: "",
    });
  },

  // Computed
  subtotal_mxn: () => {
    const { items } = get();
    return items
      .reduce((acc, i) => acc.add(new Decimal(i.subtotal_mxn)), new Decimal(0))
      .toFixed(2);
  },

  total_mxn: () => {
    // Future: subtract global discounts, add taxes
    return get().subtotal_mxn();
  },

  itemCount: () => {
    return get().items.reduce((acc, i) => acc + i.quantity, 0);
  },
}));
