import { MetadataRoute } from "next";
import { db } from "@/server/db";
import { products, categories, brands } from "@/server/db/schema";
import { eq } from "drizzle-orm";

// Generate sitemap at runtime, not build time
export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://store.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/cart`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/wishlist`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/register`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Get all active products
  const activeProducts = await db.query.products.findMany({
    where: eq(products.isActive, true),
    columns: {
      slug: true,
      updatedAt: true,
    },
  });

  const productPages: MetadataRoute.Sitemap = activeProducts.map((product) => ({
    url: `${siteUrl}/products/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Get all active categories
  const activeCategories = await db.query.categories.findMany({
    where: eq(categories.isActive, true),
    columns: {
      slug: true,
    },
  });

  const categoryPages: MetadataRoute.Sitemap = activeCategories.map(
    (category) => ({
      url: `${siteUrl}/categories/${category.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    })
  );

  // Get all active brands
  const activeBrands = await db.query.brands.findMany({
    where: eq(brands.isActive, true),
    columns: {
      slug: true,
    },
  });

  const brandPages: MetadataRoute.Sitemap = activeBrands.map((brand) => ({
    url: `${siteUrl}/brands/${brand.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticPages, ...productPages, ...categoryPages, ...brandPages];
}
