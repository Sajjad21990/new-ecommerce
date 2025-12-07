import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  image?: string;
  isNew?: boolean;
}

interface WishlistStore {
  items: WishlistItem[];

  // Actions
  addItem: (item: Omit<WishlistItem, "id">) => void;
  removeItem: (productId: string) => void;
  toggleItem: (item: Omit<WishlistItem, "id">) => void;
  clearWishlist: () => void;

  // Computed
  getItemCount: () => number;
  isInWishlist: (productId: string) => boolean;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const { items } = get();
        const existingItem = items.find((i) => i.productId === item.productId);

        if (!existingItem) {
          const id = `wishlist-${item.productId}-${Date.now()}`;
          set({ items: [...items, { ...item, id }] });
        }
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter((item) => item.productId !== productId),
        });
      },

      toggleItem: (item) => {
        const { items, addItem, removeItem } = get();
        const existingItem = items.find((i) => i.productId === item.productId);

        if (existingItem) {
          removeItem(item.productId);
        } else {
          addItem(item);
        }
      },

      clearWishlist: () => {
        set({ items: [] });
      },

      getItemCount: () => {
        return get().items.length;
      },

      isInWishlist: (productId) => {
        return get().items.some((item) => item.productId === productId);
      },
    }),
    {
      name: "wishlist-storage",
    }
  )
);
