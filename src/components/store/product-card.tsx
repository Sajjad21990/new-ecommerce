"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  basePrice: string;
  salePrice: string | null;
  imageUrl?: string;
  imageAlt?: string;
  isNew?: boolean;
  isFeatured?: boolean;
  inStock?: boolean;
  className?: string;
}

export function ProductCard({
  name,
  slug,
  basePrice,
  salePrice,
  imageUrl,
  imageAlt,
  isNew,
  inStock = true,
  className,
}: ProductCardProps) {
  const price = parseFloat(salePrice || basePrice);
  const originalPrice = salePrice ? parseFloat(basePrice) : null;
  const discount = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : null;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={cn("group", className)}>
      <Link href={`/products/${slug}`}>
        <div className="relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden mb-3">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={imageAlt || name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <span className="text-sm">No Image</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {!inStock && (
              <span className="px-2 py-1 text-xs font-medium bg-gray-600 text-white rounded">
                Out of Stock
              </span>
            )}
            {discount && discount > 0 && inStock && (
              <span className="px-2 py-1 text-xs font-medium bg-red-500 text-white rounded">
                -{discount}%
              </span>
            )}
            {isNew && inStock && (
              <span className="px-2 py-1 text-xs font-medium bg-black text-white rounded">
                New
              </span>
            )}
          </div>

          {/* Wishlist button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.preventDefault();
              // TODO: Add to wishlist
            }}
          >
            <Heart className="h-4 w-4" />
          </Button>
        </div>
      </Link>

      <Link href={`/products/${slug}`}>
        <h3 className="font-medium text-sm group-hover:text-gray-600 line-clamp-2">
          {name}
        </h3>
      </Link>

      <div className="flex items-center gap-2 mt-1">
        <span className="font-semibold">{formatPrice(price)}</span>
        {originalPrice && (
          <span className="text-sm text-gray-500 line-through">
            {formatPrice(originalPrice)}
          </span>
        )}
      </div>
    </div>
  );
}
