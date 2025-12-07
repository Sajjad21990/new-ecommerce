"use client";

import Link from "next/link";
import Image from "next/image";
import { X, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useComparisonStore } from "@/stores/comparison";
import { cn } from "@/lib/utils";

export function ComparisonBar() {
  const { items, removeItem, clearAll, getItemCount } = useComparisonStore();
  const count = getItemCount();

  if (count === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 p-4">
      <div className="container mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <GitCompare className="h-5 w-5" />
              Compare ({count}/4)
            </div>
            <div className="flex items-center gap-2">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="relative group w-16 h-16 rounded-lg border overflow-hidden bg-gray-100"
                >
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-gray-400">
                      No img
                    </div>
                  )}
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {/* Empty slots */}
              {Array.from({ length: 4 - count }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400"
                >
                  <span className="text-xs">+</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear All
            </Button>
            <Button asChild size="sm" disabled={count < 2}>
              <Link href="/compare">Compare Now</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Button to add/remove from comparison
interface CompareButtonProps {
  product: {
    productId: string;
    name: string;
    slug: string;
    price: number;
    originalPrice?: number;
    image?: string;
    categoryId?: string;
  };
  className?: string;
}

export function CompareButton({ product, className }: CompareButtonProps) {
  const { addItem, removeItem, isInComparison, canAdd } = useComparisonStore();
  const isComparing = isInComparison(product.productId);

  const handleClick = () => {
    if (isComparing) {
      removeItem(product.productId);
    } else if (canAdd()) {
      addItem(product);
    }
  };

  return (
    <Button
      variant={isComparing ? "default" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={!isComparing && !canAdd()}
      className={cn(className)}
    >
      <GitCompare className="h-4 w-4 mr-2" />
      {isComparing ? "Remove" : "Compare"}
    </Button>
  );
}
