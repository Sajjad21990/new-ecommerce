"use client";

import Link from "next/link";
import Image from "next/image";
import { useRecentlyViewedStore } from "@/stores/recently-viewed";
import { cn } from "@/lib/utils";

interface RecentlyViewedProps {
  excludeProductId?: string;
  className?: string;
  maxItems?: number;
}

export function RecentlyViewed({
  excludeProductId,
  className,
  maxItems = 6,
}: RecentlyViewedProps) {
  const { getItems } = useRecentlyViewedStore();
  const items = getItems(excludeProductId).slice(0, maxItems);

  if (items.length === 0) {
    return null;
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <section className={cn("mt-16", className)}>
      <h2 className="text-2xl font-bold mb-6">Recently Viewed</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map((item) => {
          const discount = item.originalPrice
            ? Math.round(
                ((item.originalPrice - item.price) / item.originalPrice) * 100
              )
            : null;

          return (
            <Link
              key={item.productId}
              href={`/products/${item.slug}`}
              className="group"
            >
              <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 16vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <span className="text-xs">No Image</span>
                  </div>
                )}
                {discount && discount > 0 && (
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded">
                    -{discount}%
                  </span>
                )}
              </div>
              <h3 className="font-medium text-sm line-clamp-1 group-hover:text-gray-600">
                {item.name}
              </h3>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="font-semibold text-sm">
                  {formatPrice(item.price)}
                </span>
                {item.originalPrice && (
                  <span className="text-xs text-gray-500 line-through">
                    {formatPrice(item.originalPrice)}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
