import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, isNull } from "drizzle-orm";
import { createTRPCRouter, publicProcedure, adminProcedure } from "@/server/api/trpc";
import { stockNotifications, products, productVariants } from "@/server/db/schema";

export const stockNotificationRouter = createTRPCRouter({
  // Subscribe to stock notifications
  subscribe: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if already subscribed
      const existing = await ctx.db.query.stockNotifications.findFirst({
        where: and(
          eq(stockNotifications.email, input.email),
          eq(stockNotifications.productId, input.productId),
          input.variantId
            ? eq(stockNotifications.variantId, input.variantId)
            : isNull(stockNotifications.variantId),
          eq(stockNotifications.notified, false)
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already subscribed to notifications for this item",
        });
      }

      await ctx.db.insert(stockNotifications).values({
        email: input.email,
        productId: input.productId,
        variantId: input.variantId,
      });

      return { success: true };
    }),

  // Unsubscribe from stock notifications
  unsubscribe: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(stockNotifications)
        .where(
          and(
            eq(stockNotifications.email, input.email),
            eq(stockNotifications.productId, input.productId),
            input.variantId
              ? eq(stockNotifications.variantId, input.variantId)
              : isNull(stockNotifications.variantId)
          )
        );

      return { success: true };
    }),

  // Admin: Get all pending notifications
  getAll: adminProcedure
    .input(
      z.object({
        notified: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const notifications = await ctx.db.query.stockNotifications.findMany({
        where: input.notified !== undefined
          ? eq(stockNotifications.notified, input.notified)
          : undefined,
        with: {
          product: {
            columns: { id: true, name: true, slug: true },
          },
          variant: {
            columns: { id: true, size: true, color: true, stock: true },
          },
        },
        limit: input.limit,
        offset: input.offset,
        orderBy: (n, { desc }) => [desc(n.createdAt)],
      });

      return notifications;
    }),

  // Admin: Mark notification as sent
  markNotified: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(stockNotifications)
        .set({
          notified: true,
          notifiedAt: new Date(),
        })
        .where(eq(stockNotifications.id, input.id));

      return { success: true };
    }),

  // Admin: Get subscribers for a product/variant (to send notifications when back in stock)
  getSubscribers: adminProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const subscribers = await ctx.db.query.stockNotifications.findMany({
        where: and(
          eq(stockNotifications.productId, input.productId),
          input.variantId
            ? eq(stockNotifications.variantId, input.variantId)
            : isNull(stockNotifications.variantId),
          eq(stockNotifications.notified, false)
        ),
      });

      return subscribers;
    }),

  // Admin: Notify all subscribers for a product/variant
  notifyAll: adminProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const subscribers = await ctx.db.query.stockNotifications.findMany({
        where: and(
          eq(stockNotifications.productId, input.productId),
          input.variantId
            ? eq(stockNotifications.variantId, input.variantId)
            : isNull(stockNotifications.variantId),
          eq(stockNotifications.notified, false)
        ),
      });

      // TODO: Send actual emails here using Resend
      // For now, just mark as notified

      if (subscribers.length > 0) {
        await ctx.db
          .update(stockNotifications)
          .set({
            notified: true,
            notifiedAt: new Date(),
          })
          .where(
            and(
              eq(stockNotifications.productId, input.productId),
              input.variantId
                ? eq(stockNotifications.variantId, input.variantId)
                : isNull(stockNotifications.variantId),
              eq(stockNotifications.notified, false)
            )
          );
      }

      return { notifiedCount: subscribers.length };
    }),
});
