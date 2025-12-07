import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { createTRPCRouter, publicProcedure, adminProcedure } from "@/server/api/trpc";
import { seoMetadata, products, categories } from "@/server/db/schema";

export const seoRouter = createTRPCRouter({
  // Public: Get SEO metadata for an entity
  get: publicProcedure
    .input(
      z.object({
        entityType: z.enum(["product", "category", "page"]),
        entityId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const meta = await ctx.db.query.seoMetadata.findFirst({
        where: and(
          eq(seoMetadata.entityType, input.entityType),
          eq(seoMetadata.entityId, input.entityId)
        ),
      });

      return meta;
    }),

  // Admin: Get or create SEO metadata
  getOrCreate: adminProcedure
    .input(
      z.object({
        entityType: z.enum(["product", "category", "page"]),
        entityId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      let meta = await ctx.db.query.seoMetadata.findFirst({
        where: and(
          eq(seoMetadata.entityType, input.entityType),
          eq(seoMetadata.entityId, input.entityId)
        ),
      });

      // If no metadata exists, get defaults from the entity
      if (!meta) {
        let defaults: { title?: string; description?: string; image?: string } = {};

        if (input.entityType === "product") {
          const product = await ctx.db.query.products.findFirst({
            where: eq(products.id, input.entityId),
            columns: { name: true, shortDescription: true },
            with: {
              images: {
                where: (img, { eq }) => eq(img.isPrimary, true),
                limit: 1,
              },
            },
          });
          if (product) {
            defaults = {
              title: product.name,
              description: product.shortDescription || undefined,
              image: product.images[0]?.url,
            };
          }
        } else if (input.entityType === "category") {
          const category = await ctx.db.query.categories.findFirst({
            where: eq(categories.id, input.entityId),
            columns: { name: true, description: true, image: true },
          });
          if (category) {
            defaults = {
              title: category.name,
              description: category.description || undefined,
              image: category.image || undefined,
            };
          }
        }

        return {
          id: null,
          entityType: input.entityType,
          entityId: input.entityId,
          metaTitle: defaults.title || null,
          metaDescription: defaults.description || null,
          metaKeywords: null,
          ogTitle: defaults.title || null,
          ogDescription: defaults.description || null,
          ogImage: defaults.image || null,
          canonicalUrl: null,
          noIndex: false,
          noFollow: false,
          structuredData: null,
          updatedAt: new Date(),
        };
      }

      return meta;
    }),

  // Admin: Update SEO metadata
  update: adminProcedure
    .input(
      z.object({
        entityType: z.enum(["product", "category", "page"]),
        entityId: z.string().uuid(),
        metaTitle: z.string().max(255).nullable().optional(),
        metaDescription: z.string().max(500).nullable().optional(),
        metaKeywords: z.string().nullable().optional(),
        ogTitle: z.string().max(255).nullable().optional(),
        ogDescription: z.string().max(500).nullable().optional(),
        ogImage: z.string().url().nullable().optional(),
        canonicalUrl: z.string().url().nullable().optional(),
        noIndex: z.boolean().optional(),
        noFollow: z.boolean().optional(),
        structuredData: z.record(z.string(), z.unknown()).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { entityType, entityId, ...data } = input;

      // Check if entry exists
      const existing = await ctx.db.query.seoMetadata.findFirst({
        where: and(
          eq(seoMetadata.entityType, entityType),
          eq(seoMetadata.entityId, entityId)
        ),
      });

      if (existing) {
        // Update
        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (data.metaTitle !== undefined) updateData.metaTitle = data.metaTitle;
        if (data.metaDescription !== undefined) updateData.metaDescription = data.metaDescription;
        if (data.metaKeywords !== undefined) updateData.metaKeywords = data.metaKeywords;
        if (data.ogTitle !== undefined) updateData.ogTitle = data.ogTitle;
        if (data.ogDescription !== undefined) updateData.ogDescription = data.ogDescription;
        if (data.ogImage !== undefined) updateData.ogImage = data.ogImage;
        if (data.canonicalUrl !== undefined) updateData.canonicalUrl = data.canonicalUrl;
        if (data.noIndex !== undefined) updateData.noIndex = data.noIndex;
        if (data.noFollow !== undefined) updateData.noFollow = data.noFollow;
        if (data.structuredData !== undefined) updateData.structuredData = data.structuredData;

        const [meta] = await ctx.db
          .update(seoMetadata)
          .set(updateData)
          .where(eq(seoMetadata.id, existing.id))
          .returning();

        return meta;
      } else {
        // Create new
        const [meta] = await ctx.db
          .insert(seoMetadata)
          .values({
            entityType,
            entityId,
            metaTitle: data.metaTitle,
            metaDescription: data.metaDescription,
            metaKeywords: data.metaKeywords,
            ogTitle: data.ogTitle,
            ogDescription: data.ogDescription,
            ogImage: data.ogImage,
            canonicalUrl: data.canonicalUrl,
            noIndex: data.noIndex ?? false,
            noFollow: data.noFollow ?? false,
            structuredData: data.structuredData,
          })
          .returning();

        return meta;
      }
    }),

  // Admin: Delete SEO metadata
  delete: adminProcedure
    .input(
      z.object({
        entityType: z.enum(["product", "category", "page"]),
        entityId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(seoMetadata)
        .where(
          and(
            eq(seoMetadata.entityType, input.entityType),
            eq(seoMetadata.entityId, input.entityId)
          )
        );

      return { success: true };
    }),

  // Admin: Get all SEO entries with issues (missing title, description, etc.)
  getIssues: adminProcedure.query(async ({ ctx }) => {
    // Get products without proper SEO
    const productsData = await ctx.db.query.products.findMany({
      where: eq(products.isActive, true),
      columns: { id: true, name: true, slug: true, shortDescription: true },
      limit: 100,
    });

    const productSeoData = await ctx.db.query.seoMetadata.findMany({
      where: eq(seoMetadata.entityType, "product"),
    });

    const productSeoMap = new Map(productSeoData.map((s) => [s.entityId, s]));

    const issues: Array<{
      entityType: string;
      entityId: string;
      name: string;
      slug: string;
      issues: string[];
    }> = [];

    for (const product of productsData) {
      const seo = productSeoMap.get(product.id);
      const productIssues: string[] = [];

      if (!seo?.metaTitle && !product.name) {
        productIssues.push("Missing meta title");
      }
      if (!seo?.metaDescription && !product.shortDescription) {
        productIssues.push("Missing meta description");
      }
      if (!seo?.ogImage) {
        productIssues.push("Missing OG image");
      }

      if (productIssues.length > 0) {
        issues.push({
          entityType: "product",
          entityId: product.id,
          name: product.name,
          slug: product.slug,
          issues: productIssues,
        });
      }
    }

    return issues;
  }),

  // Helper: Generate JSON-LD for product
  generateProductJsonLd: publicProcedure
    .input(z.object({ productId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.query.products.findFirst({
        where: eq(products.id, input.productId),
        with: {
          images: true,
          brand: true,
          category: true,
          reviews: {
            where: (r, { eq }) => eq(r.isApproved, true),
          },
        },
      });

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      const avgRating =
        product.reviews.length > 0
          ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
          : undefined;

      const jsonLd: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description || product.shortDescription,
        image: product.images.map((img) => img.url),
        sku: product.sku,
        brand: product.brand
          ? {
              "@type": "Brand",
              name: product.brand.name,
            }
          : undefined,
        offers: {
          "@type": "Offer",
          price: product.salePrice || product.basePrice,
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
        },
      };

      if (avgRating !== undefined) {
        jsonLd.aggregateRating = {
          "@type": "AggregateRating",
          ratingValue: avgRating.toFixed(1),
          reviewCount: product.reviews.length,
        };
      }

      return jsonLd;
    }),
});
