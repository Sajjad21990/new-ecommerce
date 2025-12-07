import { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { categories, products } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { ProductGrid } from "@/components/store/product-grid";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  // Handle special slugs
  if (slug === "new-arrivals") {
    return {
      title: "New Arrivals",
      description: "Discover our latest collection of fashion products.",
    };
  }

  if (slug === "sales") {
    return {
      title: "Sales",
      description: "Shop our best deals and discounts.",
    };
  }

  const category = await db.query.categories.findFirst({
    where: eq(categories.slug, slug),
  });

  if (!category) {
    return {
      title: "Category Not Found",
    };
  }

  return {
    title: category.name,
    description: category.description || `Shop ${category.name} products.`,
  };
}

async function getProductsByCategory(slug: string) {
  // Handle special slugs
  if (slug === "new-arrivals") {
    const newProducts = await db.query.products.findMany({
      where: and(eq(products.isActive, true), eq(products.isNew, true)),
      with: {
        images: {
          limit: 1,
          orderBy: (images, { asc }) => [asc(images.sortOrder)],
        },
        brand: true,
        category: true,
      },
      orderBy: (products, { desc }) => [desc(products.createdAt)],
      limit: 50,
    });
    return { products: newProducts, category: null, title: "New Arrivals" };
  }

  if (slug === "sales") {
    const saleProducts = await db.query.products.findMany({
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
      limit: 50,
    });
    // Filter products with sale price
    const filteredProducts = saleProducts.filter(
      (p) => p.salePrice && parseFloat(p.salePrice) < parseFloat(p.basePrice)
    );
    return { products: filteredProducts, category: null, title: "Sales" };
  }

  // Get category
  const category = await db.query.categories.findFirst({
    where: eq(categories.slug, slug),
  });

  if (!category) {
    return null;
  }

  // Get products in this category
  const categoryProducts = await db.query.products.findMany({
    where: and(
      eq(products.isActive, true),
      eq(products.categoryId, category.id)
    ),
    with: {
      images: {
        limit: 1,
        orderBy: (images, { asc }) => [asc(images.sortOrder)],
      },
      brand: true,
      category: true,
    },
    orderBy: (products, { desc }) => [desc(products.createdAt)],
    limit: 50,
  });

  return { products: categoryProducts, category, title: category.name };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const data = await getProductsByCategory(slug);

  if (!data) {
    notFound();
  }

  const { products: categoryProducts, category, title } = data;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{title}</h1>
        {category?.description && (
          <p className="text-muted-foreground mt-2">{category.description}</p>
        )}
        <p className="text-sm text-muted-foreground mt-2">
          {categoryProducts.length} product{categoryProducts.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Products Grid */}
      {categoryProducts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No products found in this category.</p>
        </div>
      ) : (
        <ProductGrid products={categoryProducts} />
      )}
    </div>
  );
}
