"use client";

import Link from "next/link";
import Image from "next/image";
import { X, ShoppingBag, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useComparisonStore } from "@/stores/comparison";
import { useCartStore } from "@/stores/cart";
import { toast } from "sonner";

export default function ComparePage() {
  const { items, removeItem, clearAll } = useComparisonStore();
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
      stock: 99, // Default stock
    });
    toast.success("Added to cart!");
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-4">Compare Products</h1>
          <p className="text-muted-foreground mb-8">
            You haven&apos;t added any products to compare yet. Browse our products
            and click &quot;Compare&quot; to add them here.
          </p>
          <Button asChild>
            <Link href="/products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Browse Products
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Comparison attributes
  const attributes = [
    { key: "price", label: "Price" },
    { key: "originalPrice", label: "Original Price" },
    { key: "discount", label: "Discount" },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Compare Products</h1>
          <p className="text-muted-foreground">
            Comparing {items.length} product{items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearAll}>
            Clear All
          </Button>
          <Button variant="outline" asChild>
            <Link href="/products">Add More</Link>
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          {/* Product Images & Names */}
          <thead>
            <tr>
              <th className="p-4 text-left font-medium text-muted-foreground bg-gray-50 border-b w-40">
                Product
              </th>
              {items.map((item) => (
                <th
                  key={item.productId}
                  className="p-4 border-b text-center min-w-[200px]"
                >
                  <div className="relative">
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <Link href={`/products/${item.slug}`}>
                      <div className="relative w-32 h-32 mx-auto bg-gray-100 rounded-lg overflow-hidden mb-3">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400">
                            No image
                          </div>
                        )}
                      </div>
                      <h3 className="font-medium text-sm hover:underline line-clamp-2">
                        {item.name}
                      </h3>
                    </Link>
                  </div>
                </th>
              ))}
              {/* Empty slots */}
              {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, i) => (
                <th
                  key={`empty-${i}`}
                  className="p-4 border-b text-center min-w-[200px]"
                >
                  <Link
                    href="/products"
                    className="block p-8 border-2 border-dashed rounded-lg text-muted-foreground hover:border-gray-400 hover:text-gray-600"
                  >
                    + Add Product
                  </Link>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Price */}
            <tr>
              <td className="p-4 font-medium bg-gray-50 border-b">Price</td>
              {items.map((item) => (
                <td
                  key={item.productId}
                  className="p-4 border-b text-center"
                >
                  <span className="text-lg font-bold">{formatPrice(item.price)}</span>
                  {item.originalPrice && (
                    <span className="block text-sm text-muted-foreground line-through">
                      {formatPrice(item.originalPrice)}
                    </span>
                  )}
                </td>
              ))}
              {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, i) => (
                <td key={`empty-price-${i}`} className="p-4 border-b text-center">
                  -
                </td>
              ))}
            </tr>

            {/* Discount */}
            <tr>
              <td className="p-4 font-medium bg-gray-50 border-b">Discount</td>
              {items.map((item) => {
                const discount = item.originalPrice
                  ? Math.round(
                      ((item.originalPrice - item.price) / item.originalPrice) * 100
                    )
                  : 0;
                return (
                  <td
                    key={item.productId}
                    className="p-4 border-b text-center"
                  >
                    {discount > 0 ? (
                      <span className="text-green-600 font-medium">{discount}% off</span>
                    ) : (
                      "-"
                    )}
                  </td>
                );
              })}
              {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, i) => (
                <td key={`empty-discount-${i}`} className="p-4 border-b text-center">
                  -
                </td>
              ))}
            </tr>

            {/* Add to Cart */}
            <tr>
              <td className="p-4 font-medium bg-gray-50">Action</td>
              {items.map((item) => (
                <td key={item.productId} className="p-4 text-center">
                  <Button
                    onClick={() => handleAddToCart(item)}
                    className="w-full max-w-[180px]"
                  >
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Add to Cart
                  </Button>
                </td>
              ))}
              {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, i) => (
                <td key={`empty-action-${i}`} className="p-4 text-center">
                  -
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
