import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, lte, sql } from "drizzle-orm";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import {
  inventoryAlerts,
  products,
  productVariants,
} from "@/server/db/schema";

export const inventoryAlertRouter = createTRPCRouter({
  // Admin: Get all inventory alerts
  getAll: adminProcedure.query(async ({ ctx }) => {
    const alerts = await ctx.db.query.inventoryAlerts.findMany({
      with: {
        product: {
          columns: { id: true, name: true, slug: true, sku: true },
        },
        variant: {
          columns: { id: true, size: true, color: true, stock: true, sku: true },
        },
      },
      orderBy: (a, { desc }) => [desc(a.createdAt)],
    });

    return alerts;
  }),

  // Admin: Get alerts that need to be sent (stock below threshold)
  getPending: adminProcedure.query(async ({ ctx }) => {
    // Get all alerts that haven't been sent
    const alerts = await ctx.db.query.inventoryAlerts.findMany({
      where: eq(inventoryAlerts.alertSent, false),
      with: {
        product: {
          columns: { id: true, name: true, slug: true, sku: true },
        },
        variant: {
          columns: { id: true, size: true, color: true, stock: true, sku: true },
        },
      },
    });

    // Filter to only those where stock is at or below threshold
    const pending = alerts.filter((alert) => {
      if (alert.variant) {
        return alert.variant.stock <= alert.threshold;
      }
      // For products without variants, we need to check total stock
      // For now, just return all non-variant alerts
      return true;
    });

    return pending;
  }),

  // Admin: Create inventory alert for a product/variant
  create: adminProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        threshold: z.number().min(0).default(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if alert already exists
      const existing = await ctx.db.query.inventoryAlerts.findFirst({
        where: and(
          eq(inventoryAlerts.productId, input.productId),
          input.variantId
            ? eq(inventoryAlerts.variantId, input.variantId)
            : sql`${inventoryAlerts.variantId} IS NULL`
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Alert already exists for this item",
        });
      }

      const [alert] = await ctx.db
        .insert(inventoryAlerts)
        .values({
          productId: input.productId,
          variantId: input.variantId,
          threshold: input.threshold,
        })
        .returning();

      return alert;
    }),

  // Admin: Update alert threshold
  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        threshold: z.number().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [alert] = await ctx.db
        .update(inventoryAlerts)
        .set({
          threshold: input.threshold,
          alertSent: false, // Reset alert status when threshold changes
          alertSentAt: null,
        })
        .where(eq(inventoryAlerts.id, input.id))
        .returning();

      return alert;
    }),

  // Admin: Delete alert
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(inventoryAlerts).where(eq(inventoryAlerts.id, input.id));
      return { success: true };
    }),

  // Admin: Mark alert as sent
  markSent: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [alert] = await ctx.db
        .update(inventoryAlerts)
        .set({
          alertSent: true,
          alertSentAt: new Date(),
        })
        .where(eq(inventoryAlerts.id, input.id))
        .returning();

      return alert;
    }),

  // Admin: Reset alert (allow it to be sent again)
  reset: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [alert] = await ctx.db
        .update(inventoryAlerts)
        .set({
          alertSent: false,
          alertSentAt: null,
        })
        .where(eq(inventoryAlerts.id, input.id))
        .returning();

      return alert;
    }),

  // Admin: Get low stock items (products/variants below their thresholds)
  getLowStock: adminProcedure
    .input(
      z.object({
        defaultThreshold: z.number().min(0).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get all variants with low stock
      const lowStockVariants = await ctx.db.query.productVariants.findMany({
        where: lte(productVariants.stock, input.defaultThreshold),
        with: {
          product: {
            columns: { id: true, name: true, slug: true, sku: true },
          },
        },
        orderBy: (v, { asc }) => [asc(v.stock)],
      });

      // Get existing alerts for these variants
      const existingAlerts = await ctx.db.query.inventoryAlerts.findMany({
        where: eq(inventoryAlerts.alertSent, false),
      });

      const alertMap = new Map(
        existingAlerts.map((a) => [`${a.productId}-${a.variantId || "null"}`, a])
      );

      return lowStockVariants.map((variant) => ({
        ...variant,
        hasAlert: alertMap.has(`${variant.productId}-${variant.id}`),
        alert: alertMap.get(`${variant.productId}-${variant.id}`),
      }));
    }),

  // Admin: Bulk create alerts for all low stock items
  bulkCreate: adminProcedure
    .input(
      z.object({
        threshold: z.number().min(0).default(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get all variants with low stock that don't have alerts
      const lowStockVariants = await ctx.db.query.productVariants.findMany({
        where: lte(productVariants.stock, input.threshold),
        columns: { id: true, productId: true },
      });

      const existingAlerts = await ctx.db.query.inventoryAlerts.findMany();
      const existingSet = new Set(
        existingAlerts.map((a) => `${a.productId}-${a.variantId || "null"}`)
      );

      const newAlerts = lowStockVariants
        .filter((v) => !existingSet.has(`${v.productId}-${v.id}`))
        .map((v) => ({
          productId: v.productId,
          variantId: v.id,
          threshold: input.threshold,
        }));

      if (newAlerts.length > 0) {
        await ctx.db.insert(inventoryAlerts).values(newAlerts);
      }

      return { created: newAlerts.length };
    }),

  // Admin: Get summary stats
  getStats: adminProcedure.query(async ({ ctx }) => {
    const alerts = await ctx.db.query.inventoryAlerts.findMany({
      with: {
        variant: {
          columns: { stock: true },
        },
      },
    });

    const total = alerts.length;
    const sent = alerts.filter((a) => a.alertSent).length;
    const pending = alerts.filter(
      (a) => !a.alertSent && a.variant && a.variant.stock <= a.threshold
    ).length;

    return {
      total,
      sent,
      pending,
      active: total - sent,
    };
  }),
});
