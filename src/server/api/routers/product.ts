import { z } from "zod";
import { eq, and, gte, lte, like, desc, asc, sql, inArray, or } from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import {
  products,
  productImages,
  productVariants,
  categories,
} from "@/server/db/schema";

const visibilityEnum = z.enum(["visible", "hidden", "catalog_only", "search_only"]);

export const productRouter = createTRPCRouter({
  // Get all products with filters
  getAll: publicProcedure
    .input(
      z.object({
        categoryId: z.string().uuid().optional(),
        brandId: z.string().uuid().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        search: z.string().optional(),
        isNew: z.boolean().optional(),
        isFeatured: z.boolean().optional(),
        sizes: z.array(z.string()).optional(),
        colors: z.array(z.string()).optional(),
        sortBy: z.enum(["price_asc", "price_desc", "newest", "name"]).optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(12),
      })
    )
    .query(async ({ ctx, input }) => {
      const {
        categoryId,
        brandId,
        minPrice,
        maxPrice,
        search,
        isNew,
        isFeatured,
        sizes,
        colors,
        sortBy,
        page,
        limit,
      } = input;

      const offset = (page - 1) * limit;

      // Build where conditions
      const conditions = [
        eq(products.isActive, true),
        // Only show visible products (or catalog_only for catalog pages)
        or(
          eq(products.visibility, "visible"),
          eq(products.visibility, "catalog_only")
        ),
        // Only show products that are published (publishedAt is null or in the past)
        or(
          sql`${products.publishedAt} IS NULL`,
          lte(products.publishedAt, new Date())
        ),
      ];

      if (categoryId) {
        conditions.push(eq(products.categoryId, categoryId));
      }
      if (brandId) {
        conditions.push(eq(products.brandId, brandId));
      }
      if (minPrice !== undefined) {
        conditions.push(gte(products.basePrice, minPrice.toString()));
      }
      if (maxPrice !== undefined) {
        conditions.push(lte(products.basePrice, maxPrice.toString()));
      }
      if (search) {
        conditions.push(like(products.name, `%${search}%`));
      }
      if (isNew !== undefined) {
        conditions.push(eq(products.isNew, isNew));
      }
      if (isFeatured !== undefined) {
        conditions.push(eq(products.isFeatured, isFeatured));
      }

      // Filter by sizes - products that have variants with matching sizes
      if (sizes && sizes.length > 0) {
        conditions.push(
          sql`${products.id} IN (
            SELECT DISTINCT ${productVariants.productId}
            FROM ${productVariants}
            WHERE ${productVariants.size} IN (${sql.join(sizes.map(s => sql`${s}`), sql`, `)})
            AND ${productVariants.isActive} = true
          )`
        );
      }

      // Filter by colors - products that have variants with matching colors
      if (colors && colors.length > 0) {
        conditions.push(
          sql`${products.id} IN (
            SELECT DISTINCT ${productVariants.productId}
            FROM ${productVariants}
            WHERE ${productVariants.color} IN (${sql.join(colors.map(c => sql`${c}`), sql`, `)})
            AND ${productVariants.isActive} = true
          )`
        );
      }

      // Build order by
      let orderBy;
      switch (sortBy) {
        case "price_asc":
          orderBy = asc(products.basePrice);
          break;
        case "price_desc":
          orderBy = desc(products.basePrice);
          break;
        case "name":
          orderBy = asc(products.name);
          break;
        case "newest":
        default:
          orderBy = desc(products.createdAt);
      }

      const [productList, countResult] = await Promise.all([
        ctx.db.query.products.findMany({
          where: and(...conditions),
          orderBy,
          limit,
          offset,
          with: {
            images: {
              where: eq(productImages.isPrimary, true),
              limit: 1,
            },
            category: {
              columns: { id: true, name: true, slug: true },
            },
            brand: {
              columns: { id: true, name: true, slug: true },
            },
          },
        }),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(products)
          .where(and(...conditions)),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      return {
        products: productList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  // Get available filter options (sizes, colors) for product filtering
  getFilterOptions: publicProcedure
    .input(
      z.object({
        categoryId: z.string().uuid().optional(),
        brandId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { categoryId, brandId } = input;

      // Build conditions for filtering
      const productConditions = [
        eq(products.isActive, true),
        or(
          eq(products.visibility, "visible"),
          eq(products.visibility, "catalog_only")
        ),
      ];

      if (categoryId) {
        productConditions.push(eq(products.categoryId, categoryId));
      }
      if (brandId) {
        productConditions.push(eq(products.brandId, brandId));
      }

      // Get unique sizes from active products/variants
      const sizesResult = await ctx.db
        .selectDistinct({ size: productVariants.size })
        .from(productVariants)
        .innerJoin(products, eq(productVariants.productId, products.id))
        .where(
          and(
            eq(productVariants.isActive, true),
            sql`${productVariants.size} IS NOT NULL`,
            ...productConditions
          )
        )
        .orderBy(asc(productVariants.size));

      // Get unique colors from active products/variants
      const colorsResult = await ctx.db
        .selectDistinct({
          color: productVariants.color,
          colorHex: productVariants.colorHex,
        })
        .from(productVariants)
        .innerJoin(products, eq(productVariants.productId, products.id))
        .where(
          and(
            eq(productVariants.isActive, true),
            sql`${productVariants.color} IS NOT NULL`,
            ...productConditions
          )
        )
        .orderBy(asc(productVariants.color));

      return {
        sizes: sizesResult
          .filter((s) => s.size)
          .map((s) => ({
            value: s.size!,
            label: s.size!,
          })),
        colors: colorsResult
          .filter((c) => c.color)
          .map((c) => ({
            value: c.color!,
            label: c.color!,
            hex: c.colorHex || undefined,
          })),
      };
    }),

  // Get single product by slug
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.query.products.findFirst({
        where: and(eq(products.slug, input.slug), eq(products.isActive, true)),
        with: {
          images: {
            orderBy: [desc(productImages.isPrimary), asc(productImages.sortOrder)],
          },
          variants: {
            where: eq(productVariants.isActive, true),
          },
          category: true,
          brand: true,
          reviews: {
            where: (reviews, { eq }) => eq(reviews.isApproved, true),
            with: {
              user: {
                columns: { id: true, name: true, image: true },
              },
            },
            orderBy: (reviews, { desc }) => [desc(reviews.createdAt)],
            limit: 10,
          },
        },
      });

      return product;
    }),

  // Get featured products
  getFeatured: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(8) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.products.findMany({
        where: and(eq(products.isActive, true), eq(products.isFeatured, true)),
        limit: input.limit,
        orderBy: desc(products.createdAt),
        with: {
          images: {
            where: eq(productImages.isPrimary, true),
            limit: 1,
          },
        },
      });
    }),

  // Get new arrivals
  getNewArrivals: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(8) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.products.findMany({
        where: and(eq(products.isActive, true), eq(products.isNew, true)),
        limit: input.limit,
        orderBy: desc(products.createdAt),
        with: {
          images: {
            where: eq(productImages.isPrimary, true),
            limit: 1,
          },
        },
      });
    }),

  // Get products by category
  getByCategory: publicProcedure
    .input(
      z.object({
        categorySlug: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(12),
      })
    )
    .query(async ({ ctx, input }) => {
      const category = await ctx.db.query.categories.findFirst({
        where: eq(categories.slug, input.categorySlug),
      });

      if (!category) {
        return { products: [], pagination: { page: 1, limit: input.limit, total: 0, totalPages: 0 } };
      }

      const offset = (input.page - 1) * input.limit;

      const [productList, countResult] = await Promise.all([
        ctx.db.query.products.findMany({
          where: and(
            eq(products.isActive, true),
            eq(products.categoryId, category.id)
          ),
          orderBy: desc(products.createdAt),
          limit: input.limit,
          offset,
          with: {
            images: {
              where: eq(productImages.isPrimary, true),
              limit: 1,
            },
            brand: {
              columns: { id: true, name: true, slug: true },
            },
          },
        }),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(products)
          .where(
            and(eq(products.isActive, true), eq(products.categoryId, category.id))
          ),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      return {
        category,
        products: productList,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
      };
    }),

  // Search products
  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.products.findMany({
        where: and(
          eq(products.isActive, true),
          like(products.name, `%${input.query}%`)
        ),
        limit: input.limit,
        with: {
          images: {
            where: eq(productImages.isPrimary, true),
            limit: 1,
          },
        },
      });
    }),

  // Get similar products
  getSimilar: publicProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        limit: z.number().min(1).max(10).default(4),
      })
    )
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.query.products.findFirst({
        where: eq(products.id, input.productId),
        columns: { categoryId: true, brandId: true },
      });

      if (!product) return [];

      return ctx.db.query.products.findMany({
        where: and(
          eq(products.isActive, true),
          eq(products.categoryId, product.categoryId!),
          sql`${products.id} != ${input.productId}`
        ),
        limit: input.limit,
        orderBy: desc(products.createdAt),
        with: {
          images: {
            where: eq(productImages.isPrimary, true),
            limit: 1,
          },
        },
      });
    }),

  // Admin: Create product
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
        shortDescription: z.string().optional(),
        care: z.string().optional(),
        deliveryAndReturns: z.string().optional(),
        gifting: z.string().optional(),
        sku: z.string().optional(),
        basePrice: z.number().positive(),
        salePrice: z.number().positive().optional(),
        categoryId: z.string().uuid().optional(),
        brandId: z.string().uuid().optional(),
        isActive: z.boolean().default(true),
        isFeatured: z.boolean().default(false),
        isNew: z.boolean().default(true),
        inStock: z.boolean().default(true),
        tags: z.array(z.string()).optional(),
        youtubeLink: z.string().url().optional(),
        visibility: visibilityEnum.default("visible"),
        minOrderQuantity: z.number().min(1).default(1),
        maxOrderQuantity: z.number().min(1).optional(),
        publishedAt: z.date().optional(),
        images: z
          .array(
            z.object({
              url: z.string().url(),
              altText: z.string().optional(),
              isPrimary: z.boolean().default(false),
              sortOrder: z.number().default(0),
            })
          )
          .optional(),
        variants: z
          .array(
            z.object({
              sku: z.string().optional(),
              size: z.string().optional(),
              color: z.string().optional(),
              colorHex: z.string().optional(),
              price: z.number().positive().optional(),
              stock: z.number().min(0).default(0),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { images, variants, ...productData } = input;

      // Create product
      const [newProduct] = await ctx.db
        .insert(products)
        .values({
          ...productData,
          basePrice: productData.basePrice.toString(),
          salePrice: productData.salePrice?.toString(),
        })
        .returning();

      // Create images
      if (images && images.length > 0) {
        await ctx.db.insert(productImages).values(
          images.map((img) => ({
            productId: newProduct.id,
            ...img,
          }))
        );
      }

      // Create variants
      if (variants && variants.length > 0) {
        await ctx.db.insert(productVariants).values(
          variants.map((variant) => ({
            productId: newProduct.id,
            ...variant,
            price: variant.price?.toString(),
          }))
        );
      }

      return newProduct;
    }),

  // Admin: Update product
  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        description: z.string().optional(),
        shortDescription: z.string().optional(),
        care: z.string().optional(),
        deliveryAndReturns: z.string().optional(),
        gifting: z.string().optional(),
        sku: z.string().optional(),
        basePrice: z.number().positive().optional(),
        salePrice: z.number().positive().nullable().optional(),
        categoryId: z.string().uuid().nullable().optional(),
        brandId: z.string().uuid().nullable().optional(),
        isActive: z.boolean().optional(),
        isFeatured: z.boolean().optional(),
        isNew: z.boolean().optional(),
        inStock: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
        youtubeLink: z.string().url().nullable().optional(),
        visibility: visibilityEnum.optional(),
        minOrderQuantity: z.number().min(1).optional(),
        maxOrderQuantity: z.number().min(1).nullable().optional(),
        publishedAt: z.date().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const [updatedProduct] = await ctx.db
        .update(products)
        .set({
          ...updateData,
          basePrice: updateData.basePrice?.toString(),
          salePrice: updateData.salePrice?.toString(),
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning();

      return updatedProduct;
    }),

  // Admin: Get product by ID (for editing)
  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.query.products.findFirst({
        where: eq(products.id, input.id),
        with: {
          images: {
            orderBy: [desc(productImages.isPrimary), asc(productImages.sortOrder)],
          },
          variants: true,
          category: true,
          brand: true,
        },
      });

      return product;
    }),

  // Admin: Delete product
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(products).where(eq(products.id, input.id));
      return { success: true };
    }),

  // Admin: List all products (including inactive)
  adminList: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        categoryId: z.string().uuid().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, categoryId, isActive } = input;
      const offset = (page - 1) * limit;

      const conditions = [];
      if (search) {
        conditions.push(like(products.name, `%${search}%`));
      }
      if (categoryId) {
        conditions.push(eq(products.categoryId, categoryId));
      }
      if (isActive !== undefined) {
        conditions.push(eq(products.isActive, isActive));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [productList, countResult] = await Promise.all([
        ctx.db.query.products.findMany({
          where: whereClause,
          orderBy: desc(products.createdAt),
          limit,
          offset,
          with: {
            images: {
              where: eq(productImages.isPrimary, true),
              limit: 1,
            },
            category: {
              columns: { id: true, name: true },
            },
            brand: {
              columns: { id: true, name: true },
            },
          },
        }),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(products)
          .where(whereClause),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      return {
        products: productList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  // Admin: Duplicate product
  duplicate: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get original product with images and variants
      const original = await ctx.db.query.products.findFirst({
        where: eq(products.id, input.id),
        with: {
          images: true,
          variants: true,
        },
      });

      if (!original) {
        throw new Error("Product not found");
      }

      // Generate new slug
      const baseSlug = original.slug.replace(/-copy(-\d+)?$/, "");
      const newSlug = `${baseSlug}-copy-${Date.now()}`;

      // Create duplicated product
      const [newProduct] = await ctx.db
        .insert(products)
        .values({
          name: `${original.name} (Copy)`,
          slug: newSlug,
          description: original.description,
          shortDescription: original.shortDescription,
          sku: original.sku ? `${original.sku}-COPY` : null,
          basePrice: original.basePrice,
          salePrice: original.salePrice,
          categoryId: original.categoryId,
          brandId: original.brandId,
          isActive: false, // Start as inactive
          isFeatured: original.isFeatured,
          isNew: original.isNew,
          tags: original.tags,
          visibility: original.visibility,
          minOrderQuantity: original.minOrderQuantity,
          maxOrderQuantity: original.maxOrderQuantity,
        })
        .returning();

      // Duplicate images
      if (original.images && original.images.length > 0) {
        await ctx.db.insert(productImages).values(
          original.images.map((img) => ({
            productId: newProduct.id,
            url: img.url,
            altText: img.altText,
            sortOrder: img.sortOrder,
            isPrimary: img.isPrimary,
          }))
        );
      }

      // Duplicate variants
      if (original.variants && original.variants.length > 0) {
        await ctx.db.insert(productVariants).values(
          original.variants.map((v) => ({
            productId: newProduct.id,
            sku: v.sku ? `${v.sku}-COPY` : null,
            size: v.size,
            color: v.color,
            colorHex: v.colorHex,
            price: v.price,
            stock: 0, // Reset stock
            isActive: v.isActive,
          }))
        );
      }

      return newProduct;
    }),

  // Admin: Bulk update products
  bulkUpdate: adminProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()),
        data: z.object({
          isActive: z.boolean().optional(),
          isFeatured: z.boolean().optional(),
          isNew: z.boolean().optional(),
          visibility: visibilityEnum.optional(),
          categoryId: z.string().uuid().nullable().optional(),
          brandId: z.string().uuid().nullable().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { ids, data } = input;

      await ctx.db
        .update(products)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(inArray(products.id, ids));

      return { success: true, count: ids.length };
    }),

  // Admin: Bulk delete products
  bulkDelete: adminProcedure
    .input(z.object({ ids: z.array(z.string().uuid()) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(products).where(inArray(products.id, input.ids));
      return { success: true, count: input.ids.length };
    }),

  // Admin: Export products (returns data for CSV generation)
  export: adminProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()).optional(), // If not provided, export all
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = input.ids ? [inArray(products.id, input.ids)] : [];

      const productList = await ctx.db.query.products.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          category: { columns: { name: true } },
          brand: { columns: { name: true } },
          variants: true,
        },
      });

      // Format for CSV export
      return productList.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        description: p.description,
        shortDescription: p.shortDescription,
        basePrice: p.basePrice,
        salePrice: p.salePrice,
        category: p.category?.name || "",
        brand: p.brand?.name || "",
        isActive: p.isActive,
        isFeatured: p.isFeatured,
        isNew: p.isNew,
        visibility: p.visibility,
        minOrderQuantity: p.minOrderQuantity,
        maxOrderQuantity: p.maxOrderQuantity,
        tags: p.tags?.join(", ") || "",
        totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
        variantCount: p.variants.length,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));
    }),

  // Admin: Import products (from parsed CSV data)
  import: adminProcedure
    .input(
      z.object({
        products: z.array(
          z.object({
            name: z.string(),
            slug: z.string(),
            sku: z.string().optional(),
            description: z.string().optional(),
            shortDescription: z.string().optional(),
            basePrice: z.number(),
            salePrice: z.number().optional(),
            categoryId: z.string().uuid().optional(),
            brandId: z.string().uuid().optional(),
            isActive: z.boolean().default(true),
            isFeatured: z.boolean().default(false),
            isNew: z.boolean().default(true),
            visibility: visibilityEnum.default("visible"),
            minOrderQuantity: z.number().default(1),
            maxOrderQuantity: z.number().optional(),
            tags: z.array(z.string()).optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results = {
        created: 0,
        updated: 0,
        errors: [] as string[],
      };

      for (const product of input.products) {
        try {
          // Check if product with slug exists
          const existing = await ctx.db.query.products.findFirst({
            where: eq(products.slug, product.slug),
          });

          if (existing) {
            // Update existing
            await ctx.db
              .update(products)
              .set({
                ...product,
                basePrice: product.basePrice.toString(),
                salePrice: product.salePrice?.toString(),
                updatedAt: new Date(),
              })
              .where(eq(products.id, existing.id));
            results.updated++;
          } else {
            // Create new
            await ctx.db.insert(products).values({
              ...product,
              basePrice: product.basePrice.toString(),
              salePrice: product.salePrice?.toString(),
            });
            results.created++;
          }
        } catch (error) {
          results.errors.push(`Error with product "${product.name}": ${error}`);
        }
      }

      return results;
    }),
});
