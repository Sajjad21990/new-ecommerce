"use client";

import { useSearchParams } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/store/product-card";
import Link from "next/link";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const { data, isLoading } = trpc.product.search.useQuery(
    { query, limit: 20 },
    { enabled: query.length > 0 }
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Search Results
        </h1>
        {query ? (
          <p className="text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-5 w-60 inline-block" />
            ) : (
              <>
                {data?.length || 0} results for &quot;{query}&quot;
              </>
            )}
          </p>
        ) : (
          <p className="text-muted-foreground">
            Enter a search term to find products
          </p>
        )}
      </div>

      {/* Results */}
      {!query ? (
        <div className="text-center py-16">
          <SearchIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">
            Start typing to search for products
          </p>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[3/4] rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : data?.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg text-muted-foreground mb-4">
            No products found for &quot;{query}&quot;
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Try using different keywords or browse our categories
          </p>
          <Link
            href="/products"
            className="text-primary hover:underline font-medium"
          >
            View All Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {data?.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              slug={product.slug}
              basePrice={product.basePrice}
              salePrice={product.salePrice}
              imageUrl={product.images?.[0]?.url}
              imageAlt={product.images?.[0]?.altText ?? undefined}
              isNew={product.isNew}
              isFeatured={product.isFeatured}
            />
          ))}
        </div>
      )}
    </div>
  );
}
