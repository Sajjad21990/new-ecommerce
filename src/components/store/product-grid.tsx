import { ProductCard } from "./product-card";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  slug: string;
  basePrice: string;
  salePrice: string | null;
  isNew: boolean | null;
  isFeatured: boolean | null;
  images: { url: string; altText?: string | null }[];
  brand?: { name: string } | null;
  category?: { name: string } | null;
}

interface ProductGridProps {
  products: Product[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function ProductGrid({ products, columns = 4, className }: ProductGridProps) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-6", gridCols[columns], className)}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          id={product.id}
          name={product.name}
          slug={product.slug}
          basePrice={product.basePrice}
          salePrice={product.salePrice}
          imageUrl={product.images?.[0]?.url}
          imageAlt={product.images?.[0]?.altText ?? undefined}
          isNew={product.isNew ?? false}
          isFeatured={product.isFeatured ?? false}
        />
      ))}
    </div>
  );
}
