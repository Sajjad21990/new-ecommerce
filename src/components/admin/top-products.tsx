"use client";

import Image from "next/image";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, Package, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function TopProducts() {
  const { data, isLoading } = trpc.product.adminList.useQuery({
    page: 1,
    limit: 5,
    isActive: true,
  });

  const products = data?.products || [];

  // Generate mock sales data since we don't have real analytics
  const productsWithSales = products.map((product, index) => ({
    ...product,
    sales: Math.floor(Math.random() * 100) + 20 - index * 10,
    revenue: (Math.floor(Math.random() * 5000) + 1000 - index * 500).toFixed(2),
  }));

  return (
    <Card className="border">
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
          <div className="p-6 text-center text-sm text-muted-foreground">
            Loading products...
          </div>
        ) : productsWithSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No products yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {productsWithSales.map((product, index) => (
              <Link
                key={product.id}
                href={`/admin/products/${product.id}`}
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
                  {product.images && product.images[0] ? (
                    <Image
                      src={product.images[0].url}
                      alt={product.name}
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
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {product.sales} sales
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    >
                      <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                      {Math.floor(Math.random() * 30) + 5}%
                    </Badge>
                  </div>
                </div>

                {/* Revenue */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">
                    ${parseFloat(product.revenue).toLocaleString()}
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
