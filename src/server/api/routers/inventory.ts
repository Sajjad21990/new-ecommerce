import { z } from "zod";
import { eq, desc, sql, and, lt, or, isNull } from "drizzle-orm";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { products, productVariants, inventoryAlerts } from "@/server/db/schema";

export const inventoryRouter = createTRPCRouter({
  // Get inventory overview with stock levels
  getOverview: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        filter: z.enum(["all", "low_stock", "out_of_stock", "in_stock"]).default("all"),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, filter, search } = input;
      const offset = (page - 1) * limit;

      // Get all products with their variants
      const productsList = await ctx.db
        .select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          isActive: products.isActive,
          basePrice: products.basePrice,
          inStock: products.inStock,
        })
        .from(products)
        .where(
          search
            ? or(
                sql`${products.name} ILIKE ${`%${search}%`}`,
                sql`${products.sku} ILIKE ${`%${search}%`}`
              )
            : undefined
        )
        .orderBy(desc(products.createdAt));

      // Get all variants
      const variantsList = await ctx.db
        .select({
          id: productVariants.id,
          productId: productVariants.productId,
          sku: productVariants.sku,
          size: productVariants.size,
          color: productVariants.color,
          stock: productVariants.stock,
          price: productVariants.price,
          isActive: productVariants.isActive,
        })
        .from(productVariants)
        .orderBy(productVariants.productId);

      // Group variants by product
      const variantsByProduct = new Map<string, typeof variantsList>();
      for (const variant of variantsList) {
        if (!variantsByProduct.has(variant.productId)) {
          variantsByProduct.set(variant.productId, []);
        }
        variantsByProduct.get(variant.productId)!.push(variant);
      }

      // Build inventory items - use product-level inStock boolean
      const inventoryItems = productsList.map((product) => {
        const variants = variantsByProduct.get(product.id) || [];
        const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
        const hasVariants = variants.length > 0;

        return {
          ...product,
          variants,
          totalStock,
          hasVariants,
          // Use the product-level inStock field for binary stock management
          stockStatus: product.inStock ? "in_stock" : "out_of_stock",
        };
      });

      // Apply filter
      let filteredItems = inventoryItems;
      if (filter !== "all") {
        filteredItems = inventoryItems.filter((item) => item.stockStatus === filter);
      }

      // Paginate
      const paginatedItems = filteredItems.slice(offset, offset + limit);

      // Get stats
      const stats = {
        total: inventoryItems.length,
        inStock: inventoryItems.filter((i) => i.stockStatus === "in_stock").length,
        lowStock: inventoryItems.filter((i) => i.stockStatus === "low_stock").length,
        outOfStock: inventoryItems.filter((i) => i.stockStatus === "out_of_stock").length,
        totalUnits: inventoryItems.reduce((sum, i) => sum + i.totalStock, 0),
      };

      return {
        items: paginatedItems,
        stats,
        total: filteredItems.length,
        page,
        limit,
        totalPages: Math.ceil(filteredItems.length / limit),
      };
    }),

  // Update product inStock status
  updateInStock: adminProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        inStock: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { productId, inStock } = input;

      const [updated] = await ctx.db
        .update(products)
        .set({ inStock })
        .where(eq(products.id, productId))
        .returning();

      if (!updated) {
        throw new Error("Product not found");
      }

      return updated;
    }),

  // Update variant stock
  updateStock: adminProcedure
    .input(
      z.object({
        variantId: z.string().uuid(),
        stock: z.number().min(0),
        adjustment: z.enum(["set", "add", "subtract"]).default("set"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { variantId, stock, adjustment } = input;

      const variant = await ctx.db.query.productVariants.findFirst({
        where: eq(productVariants.id, variantId),
      });

      if (!variant) {
        throw new Error("Variant not found");
      }

      let newStock = stock;
      if (adjustment === "add") {
        newStock = variant.stock + stock;
      } else if (adjustment === "subtract") {
        newStock = Math.max(0, variant.stock - stock);
      }

      const [updated] = await ctx.db
        .update(productVariants)
        .set({ stock: newStock })
        .where(eq(productVariants.id, variantId))
        .returning();

      return updated;
    }),

  // Bulk update stock
  bulkUpdateStock: adminProcedure
    .input(
      z.object({
        updates: z.array(
          z.object({
            variantId: z.string().uuid(),
            stock: z.number().min(0),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results = [];

      for (const update of input.updates) {
        const [updated] = await ctx.db
          .update(productVariants)
          .set({ stock: update.stock })
          .where(eq(productVariants.id, update.variantId))
          .returning();
        results.push(updated);
      }

      return results;
    }),

  // Get low stock alerts
  getLowStockAlerts: adminProcedure.query(async ({ ctx }) => {
    const lowStockVariants = await ctx.db
      .select({
        variantId: productVariants.id,
        productId: productVariants.productId,
        productName: products.name,
        variantSku: productVariants.sku,
        size: productVariants.size,
        color: productVariants.color,
        stock: productVariants.stock,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(and(lt(productVariants.stock, 5), eq(productVariants.isActive, true)))
      .orderBy(productVariants.stock);

    return lowStockVariants;
  }),

  // Set stock alert threshold
  setAlertThreshold: adminProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        threshold: z.number().min(0).default(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.inventoryAlerts.findFirst({
        where: and(
          eq(inventoryAlerts.productId, input.productId),
          input.variantId
            ? eq(inventoryAlerts.variantId, input.variantId)
            : isNull(inventoryAlerts.variantId)
        ),
      });

      if (existing) {
        const [updated] = await ctx.db
          .update(inventoryAlerts)
          .set({ threshold: input.threshold })
          .where(eq(inventoryAlerts.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await ctx.db
        .insert(inventoryAlerts)
        .values({
          productId: input.productId,
          variantId: input.variantId,
          threshold: input.threshold,
        })
        .returning();

      return created;
    }),
});
