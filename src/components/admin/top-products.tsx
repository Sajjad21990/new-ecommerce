"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Package, ImageIcon, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { subDays } from "date-fns";

interface TopProductsProps {
  className?: string;
  startDate?: Date;
  endDate?: Date;
}

export function TopProducts({ className, startDate, endDate }: TopProductsProps) {
  // Default to last 30 days if no dates provided
  const queryDates = useMemo(() => {
    return {
      startDate: startDate || subDays(new Date(), 30),
      endDate: endDate || new Date(),
    };
  }, [startDate, endDate]);

  const { data: topProductsData, isLoading } = trpc.reports.topProducts.useQuery({
    startDate: queryDates.startDate,
    endDate: queryDates.endDate,
    limit: 5,
  });

  // Get product images from product list
  const { data: productsData } = trpc.product.adminList.useQuery({
    page: 1,
    limit: 100,
  });

  // Merge top products data with product images
  const productsWithImages = useMemo(() => {
    if (!topProductsData) return [];

    const productMap = new Map(
      productsData?.products.map((p) => [p.id, p]) || []
    );

    return topProductsData.map((item) => {
      const product = item.productId ? productMap.get(item.productId) : null;
      return {
        ...item,
        image: product?.images?.[0]?.url || null,
      };
    });
  }, [topProductsData, productsData]);

  return (
    <Card className={cn("border", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base font-semibold">Top Products</CardTitle>
        <Button variant="ghost" size="sm" className="text-xs" asChild>
          <Link href="/admin/products">
            View All
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : productsWithImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No sales data yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Top selling products will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {productsWithImages.map((product, index) => (
              <Link
                key={product.productId || index}
                href={product.productId ? `/admin/products/${product.productId}` : "#"}
                className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors group"
              >
                {/* Rank */}
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold shrink-0",
                    index === 0
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : index === 1
                      ? "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                      : index === 2
                      ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {index + 1}
                </div>

                {/* Product Image */}
                <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-muted shrink-0">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.productName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{product.productName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {product.totalQuantity} sold
                    </span>
                    <span className="text-xs text-muted-foreground">
                      • {product.orderCount} orders
                    </span>
                  </div>
                </div>

                {/* Revenue */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    ₹{product.totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
