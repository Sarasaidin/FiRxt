
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItemType =
  | "PHYSICAL"
  | "SERVICE"
  | "BLOOD_TEST_PACKAGE";

export interface CartItem {
  id: string;
  type: CartItemType;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  partnerId: string;
  partnerName: string;
  partnerSlug: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string, type: CartItemType) => void;
  updateQuantity: (
    id: string,
    type: CartItemType,
    quantity: number
  ) => void;
  clearCart: () => void;
  itemCount: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const items = get().items;

        const existing = items.find(
          (i) => i.id === item.id && i.type === item.type
        );

        if (existing) {
          set({
            items: items.map((i) =>
              i.id === item.id && i.type === item.type
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          });
        } else {
          set({ items: [...items, item] });
        }
      },

      removeItem: (id, type) => {
        set({
          items: get().items.filter(
            (i) => !(i.id === id && i.type === type)
          ),
        });
      },

      updateQuantity: (id, type, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id, type);
          return;
        }

        set({
          items: get().items.map((i) =>
            i.id === id && i.type === type
              ? { ...i, quantity }
              : i
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      itemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),

      subtotal: () =>
        get().items.reduce(
          (sum, i) => sum + i.price * i.quantity,
          0
        ),
    }),
    { name: "firxt-cart" }
  )
);
