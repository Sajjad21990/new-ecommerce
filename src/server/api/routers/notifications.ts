import { z } from "zod";
import { eq, desc, and, count, sql } from "drizzle-orm";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { adminNotifications } from "@/server/db/schema";

export const notificationsRouter = createTRPCRouter({
  // Get notifications with pagination
  getAll: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
        unreadOnly: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, unreadOnly } = input;
      const offset = (page - 1) * limit;

      const whereClause = unreadOnly
        ? eq(adminNotifications.isRead, false)
        : undefined;

      const [notifications, totalCount] = await Promise.all([
        ctx.db
          .select()
          .from(adminNotifications)
          .where(whereClause)
          .orderBy(desc(adminNotifications.createdAt))
          .limit(limit)
          .offset(offset),
        ctx.db
          .select({ count: count() })
          .from(adminNotifications)
          .where(whereClause),
      ]);

      return {
        notifications,
        total: totalCount[0]?.count || 0,
        page,
        limit,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
      };
    }),

  // Get unread count
  getUnreadCount: adminProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({ count: count() })
      .from(adminNotifications)
      .where(eq(adminNotifications.isRead, false));

    return result[0]?.count || 0;
  }),

  // Mark notification as read
  markAsRead: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(adminNotifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(eq(adminNotifications.id, input.id))
        .returning();

      return updated;
    }),

  // Mark all as read
  markAllAsRead: adminProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(adminNotifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(eq(adminNotifications.isRead, false));

    return { success: true };
  }),

  // Create notification (internal use)
  create: adminProcedure
    .input(
      z.object({
        type: z.enum(["order", "inventory", "review", "return", "customer", "system"]),
        title: z.string().min(1),
        message: z.string().min(1),
        link: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [notification] = await ctx.db
        .insert(adminNotifications)
        .values({
          type: input.type,
          title: input.title,
          message: input.message,
          link: input.link,
          metadata: input.metadata,
        })
        .returning();

      return notification;
    }),

  // Delete notification
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(adminNotifications)
        .where(eq(adminNotifications.id, input.id));

      return { success: true };
    }),

  // Clear all notifications
  clearAll: adminProcedure.mutation(async ({ ctx }) => {
    await ctx.db.delete(adminNotifications);
    return { success: true };
  }),
});
