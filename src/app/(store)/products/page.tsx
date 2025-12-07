"use client";

import { useSearchParams } from "next/navigation";
import { Grid3X3, LayoutGrid } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/store/product-card";
import { ProductFilters } from "@/components/store/product-filters";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const [gridCols, setGridCols] = useState<3 | 4>(4);

  const page = Number(searchParams.get("page")) || 1;
  const sortBy = searchParams.get("sort") as "price_asc" | "price_desc" | "newest" | "name" | undefined;
  const search = searchParams.get("search") || undefined;
  const categoryId = searchParams.get("categories")?.split(",")[0] || undefined;
  const brandId = searchParams.get("brands")?.split(",")[0] || undefined;
  const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
  const sizes = searchParams.get("sizes")?.split(",").filter(Boolean) || undefined;
  const colors = searchParams.get("colors")?.split(",").filter(Boolean) || undefined;

  const { data, isLoading } = trpc.product.getAll.useQuery({
    page,
    limit: 12,
    sortBy,
    search,
    categoryId,
    brandId,
    minPrice,
    maxPrice,
    sizes: sizes?.length ? sizes : undefined,
    colors: colors?.length ? colors : undefined,
  });

  const { data: categories } = trpc.category.getAll.useQuery();
  const { data: brands } = trpc.brand.getAll.useQuery();
  const { data: filterOptions } = trpc.product.getFilterOptions.useQuery({
    categoryId,
    brandId,
  });

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "default") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    window.history.pushState(null, "", `?${params.toString()}`);
    window.location.reload();
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    window.history.pushState(null, "", `?${params.toString()}`);
    window.location.reload();
  };

  // Flatten categories for filter
  const flatCategories = categories?.flatMap((cat) => [
    { id: cat.id, name: cat.name, slug: cat.slug },
    ...(cat.children || []).map((child) => ({
      id: child.id,
      name: child.name,
      slug: child.slug,
    })),
  ]) || [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">All Products</h1>
        <p className="text-muted-foreground">
          {isLoading ? (
            <Skeleton className="h-5 w-40 inline-block" />
          ) : (
            `${data?.pagination.total || 0} products found`
          )}
        </p>
      </div>

      <div className="flex gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <ProductFilters
            categories={flatCategories.map((c) => ({ value: c.id, label: c.name }))}
            brands={(brands || []).map((b) => ({ value: b.id, label: b.name }))}
            sizes={filterOptions?.sizes || []}
            colors={filterOptions?.colors || []}
            minPrice={0}
            maxPrice={10000}
          />
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-2">
              {/* Mobile Filter Button */}
              <div className="lg:hidden">
                <ProductFilters
                  categories={flatCategories.map((c) => ({ value: c.id, label: c.name }))}
                  brands={(brands || []).map((b) => ({ value: b.id, label: b.name }))}
                  sizes={filterOptions?.sizes || []}
                  colors={filterOptions?.colors || []}
                  minPrice={0}
                  maxPrice={10000}
                />
              </div>

              {/* Grid Toggle */}
              <div className="hidden sm:flex items-center gap-1 border rounded-md p-1">
                <Button
                  variant={gridCols === 3 ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setGridCols(3)}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={gridCols === 4 ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setGridCols(4)}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Sort */}
            <Select
              value={sortBy || "default"}
              onValueChange={handleSortChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Featured</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
                <SelectItem value="name">Name: A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <div
              className={cn(
                "grid gap-6",
                gridCols === 3 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              )}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[3/4] rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : data?.products.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg text-muted-foreground">No products found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your filters or search terms
              </p>
            </div>
          ) : (
            <div
              className={cn(
                "grid gap-6",
                gridCols === 3 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              )}
            >
              {data?.products.map((product) => (
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

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-12">
              <Button
                variant="outline"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, data.pagination.totalPages) }).map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="icon"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === data.pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
