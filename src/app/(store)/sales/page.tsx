import { Metadata } from "next";
import { db } from "@/server/db";
import { products } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { ProductGrid } from "@/components/store/product-grid";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sales",
  description: "Shop our best deals and discounts. Limited time offers on premium fashion.",
};

async function getSaleProducts() {
  const allProducts = await db.query.products.findMany({
    where: eq(products.isActive, true),
    with: {
      images: {
        limit: 1,
        orderBy: (images, { asc }) => [asc(images.sortOrder)],
      },
      brand: true,
      category: true,
    },
    orderBy: (products, { desc }) => [desc(products.createdAt)],
  });

  // Filter products with sale price
  return allProducts.filter(
    (p) => p.salePrice && parseFloat(p.salePrice) < parseFloat(p.basePrice)
  );
}

export default async function SalesPage() {
  const saleProducts = await getSaleProducts();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <span className="inline-block px-4 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full mb-4">
          Limited Time Offer
        </span>
        <h1 className="text-4xl font-bold mb-2">Sale</h1>
        <p className="text-muted-foreground">
          Don&apos;t miss out on these amazing deals!
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {saleProducts.length} product{saleProducts.length !== 1 ? "s" : ""} on sale
        </p>
      </div>

      {/* Products Grid */}
      {saleProducts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No products on sale at the moment. Check back soon!</p>
        </div>
      ) : (
        <ProductGrid products={saleProducts} />
      )}
    </div>
  );
}
