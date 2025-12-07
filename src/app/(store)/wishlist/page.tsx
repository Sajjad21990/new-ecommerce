"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag, X, ArrowRight } from "lucide-react";
import { useWishlistStore } from "@/stores/wishlist";
import { useCartStore } from "@/stores/cart";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function WishlistPage() {
  const { items, removeItem, clearWishlist } = useWishlistStore();
  const { addItem: addToCart } = useCartStore();

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleAddToCart = (item: (typeof items)[0]) => {
    addToCart({
      productId: item.productId,
      variantId: null,
      name: item.name,
      slug: item.slug,
      price: item.price,
      originalPrice: item.originalPrice,
      quantity: 1,
      image: item.image,
      stock: 99, // Default stock for wishlist items
    });
    removeItem(item.productId);
    toast.success("Added to cart!");
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <Heart className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-4">Your wishlist is empty</h1>
          <p className="text-muted-foreground mb-8">
            Save items you love to your wishlist and they&apos;ll appear here.
          </p>
          <Button asChild size="lg">
            <Link href="/products">
              Browse Products
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Wishlist</h1>
          <p className="text-muted-foreground">{items.length} items saved</p>
        </div>
        <Button variant="outline" onClick={clearWishlist}>
          Clear All
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {items.map((item) => {
          const discount = item.originalPrice
            ? Math.round(
                ((item.originalPrice - item.price) / item.originalPrice) * 100
              )
            : null;

          return (
            <div key={item.id} className="group">
              <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden mb-3">
                {item.image ? (
                  <Link href={`/products/${item.slug}`}>
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No Image
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {discount && discount > 0 && (
                    <span className="px-2 py-1 text-xs font-medium bg-red-500 text-white rounded">
                      -{discount}%
                    </span>
                  )}
                  {item.isNew && (
                    <span className="px-2 py-1 text-xs font-medium bg-black text-white rounded">
                      New
                    </span>
                  )}
                </div>

                {/* Remove from Wishlist */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                  onClick={() => {
                    removeItem(item.productId);
                    toast.success("Removed from wishlist");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>

                {/* Add to Cart Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    className="w-full"
                    onClick={() => handleAddToCart(item)}
                  >
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Add to Cart
                  </Button>
                </div>
              </div>

              <Link href={`/products/${item.slug}`}>
                <h3 className="font-medium text-sm group-hover:text-gray-600 line-clamp-2">
                  {item.name}
                </h3>
              </Link>

              <div className="flex items-center gap-2 mt-1">
                <span className="font-semibold">{formatPrice(item.price)}</span>
                {item.originalPrice && item.originalPrice > item.price && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(item.originalPrice)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
