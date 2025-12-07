import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ComparisonItem {
  productId: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  image?: string;
  categoryId?: string;
}

interface ComparisonStore {
  items: ComparisonItem[];
  maxItems: number;

  // Actions
  addItem: (item: ComparisonItem) => boolean;
  removeItem: (productId: string) => void;
  clearAll: () => void;

  // Computed
  getItemCount: () => number;
  isInComparison: (productId: string) => boolean;
  canAdd: () => boolean;
}

export const useComparisonStore = create<ComparisonStore>()(
  persist(
    (set, get) => ({
      items: [],
      maxItems: 4,

      addItem: (item) => {
        const { items, maxItems } = get();

        // Check if already exists
        if (items.some((i) => i.productId === item.productId)) {
          return false;
        }

        // Check if max reached
        if (items.length >= maxItems) {
          return false;
        }

        set({ items: [...items, item] });
        return true;
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter((item) => item.productId !== productId),
        });
      },

      clearAll: () => {
        set({ items: [] });
      },

      getItemCount: () => {
        return get().items.length;
      },

      isInComparison: (productId) => {
        return get().items.some((item) => item.productId === productId);
      },

      canAdd: () => {
        return get().items.length < get().maxItems;
      },
    }),
    {
      name: "comparison-storage",
    }
  )
);
