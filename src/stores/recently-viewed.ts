import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RecentlyViewedItem {
  productId: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  image?: string;
  viewedAt: number;
}

interface RecentlyViewedStore {
  items: RecentlyViewedItem[];
  maxItems: number;

  // Actions
  addItem: (item: Omit<RecentlyViewedItem, "viewedAt">) => void;
  removeItem: (productId: string) => void;
  clearAll: () => void;

  // Computed
  getItems: (excludeProductId?: string) => RecentlyViewedItem[];
}

export const useRecentlyViewedStore = create<RecentlyViewedStore>()(
  persist(
    (set, get) => ({
      items: [],
      maxItems: 12,

      addItem: (item) => {
        const { items, maxItems } = get();
        // Remove existing entry for this product
        const filtered = items.filter((i) => i.productId !== item.productId);
        // Add to front with timestamp
        const newItem: RecentlyViewedItem = {
          ...item,
          viewedAt: Date.now(),
        };
        // Keep only maxItems
        const newItems = [newItem, ...filtered].slice(0, maxItems);
        set({ items: newItems });
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter((item) => item.productId !== productId),
        });
      },

      clearAll: () => {
        set({ items: [] });
      },

      getItems: (excludeProductId) => {
        const { items } = get();
        if (excludeProductId) {
          return items.filter((item) => item.productId !== excludeProductId);
        }
        return items;
      },
    }),
    {
      name: "recently-viewed-storage",
    }
  )
);
