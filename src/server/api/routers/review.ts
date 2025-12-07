import { z } from "zod";
import { eq, and, desc, avg, count } from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { reviews, orderItems, orders } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";

export const reviewRouter = createTRPCRouter({
  // Get reviews for a product (public)
  getByProduct: publicProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { productId, page, limit } = input;
      const offset = (page - 1) * limit;

      const productReviews = await ctx.db.query.reviews.findMany({
        where: and(
          eq(reviews.productId, productId),
          eq(reviews.isApproved, true)
        ),
        orderBy: desc(reviews.createdAt),
        limit,
        offset,
        with: {
          user: {
            columns: { id: true, name: true, image: true },
          },
        },
      });

      // Get rating stats
      const stats = await ctx.db
        .select({
          avgRating: avg(reviews.rating),
          totalReviews: count(),
        })
        .from(reviews)
        .where(
          and(eq(reviews.productId, productId), eq(reviews.isApproved, true))
        );

      // Get rating distribution
      const distribution = await ctx.db
        .select({
          rating: reviews.rating,
          count: count(),
        })
        .from(reviews)
        .where(
          and(eq(reviews.productId, productId), eq(reviews.isApproved, true))
        )
        .groupBy(reviews.rating);

      const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      distribution.forEach((d) => {
        ratingCounts[d.rating] = Number(d.count);
      });

      return {
        reviews: productReviews,
        stats: {
          averageRating: stats[0]?.avgRating ? Number(stats[0].avgRating) : 0,
          totalReviews: Number(stats[0]?.totalReviews) || 0,
          ratingDistribution: ratingCounts,
        },
      };
    }),

  // Check if user can review a product (must have purchased)
  canReview: protectedProcedure
    .input(z.object({ productId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if user has already reviewed
      const existingReview = await ctx.db.query.reviews.findFirst({
        where: and(
          eq(reviews.productId, input.productId),
          eq(reviews.userId, userId)
        ),
      });

      if (existingReview) {
        return { canReview: false, reason: "already_reviewed", review: existingReview };
      }

      // Check if user has purchased the product
      const hasPurchased = await ctx.db
        .select({ id: orderItems.id })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            eq(orderItems.productId, input.productId),
            eq(orders.userId, userId),
            eq(orders.paymentStatus, "paid")
          )
        )
        .limit(1);

      if (hasPurchased.length === 0) {
        return { canReview: false, reason: "not_purchased" };
      }

      return { canReview: true };
    }),

  // Create a review
  create: protectedProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        rating: z.number().min(1).max(5),
        title: z.string().max(255).optional(),
        comment: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if already reviewed
      const existingReview = await ctx.db.query.reviews.findFirst({
        where: and(
          eq(reviews.productId, input.productId),
          eq(reviews.userId, userId)
        ),
      });

      if (existingReview) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You have already reviewed this product",
        });
      }

      // Check if user has purchased the product
      const hasPurchased = await ctx.db
        .select({ id: orderItems.id })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            eq(orderItems.productId, input.productId),
            eq(orders.userId, userId),
            eq(orders.paymentStatus, "paid")
          )
        )
        .limit(1);

      if (hasPurchased.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only review products you have purchased",
        });
      }

      // Create review (auto-approved for simplicity, can be changed to require moderation)
      const [review] = await ctx.db
        .insert(reviews)
        .values({
          productId: input.productId,
          userId,
          rating: input.rating,
          title: input.title,
          comment: input.comment,
          isApproved: true, // Auto-approve for now
        })
        .returning();

      return review;
    }),

  // Update a review (user can edit their own review)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        rating: z.number().min(1).max(5),
        title: z.string().max(255).optional(),
        comment: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify ownership
      const existingReview = await ctx.db.query.reviews.findFirst({
        where: and(eq(reviews.id, input.id), eq(reviews.userId, userId)),
      });

      if (!existingReview) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      const [updatedReview] = await ctx.db
        .update(reviews)
        .set({
          rating: input.rating,
          title: input.title,
          comment: input.comment,
          updatedAt: new Date(),
        })
        .where(eq(reviews.id, input.id))
        .returning();

      return updatedReview;
    }),

  // Delete a review (user can delete their own)
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const existingReview = await ctx.db.query.reviews.findFirst({
        where: and(eq(reviews.id, input.id), eq(reviews.userId, userId)),
      });

      if (!existingReview) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      await ctx.db.delete(reviews).where(eq(reviews.id, input.id));

      return { success: true };
    }),

  // Get user's reviews
  getMyReviews: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const userReviews = await ctx.db.query.reviews.findMany({
      where: eq(reviews.userId, userId),
      orderBy: desc(reviews.createdAt),
      with: {
        product: {
          columns: { id: true, name: true, slug: true },
          with: {
            images: {
              limit: 1,
            },
          },
        },
      },
    });

    return userReviews;
  }),

  // Admin: Get all reviews
  adminList: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        isApproved: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, isApproved } = input;
      const offset = (page - 1) * limit;

      const conditions = isApproved !== undefined ? [eq(reviews.isApproved, isApproved)] : [];

      const allReviews = await ctx.db.query.reviews.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: desc(reviews.createdAt),
        limit,
        offset,
        with: {
          user: {
            columns: { id: true, name: true, email: true },
          },
          product: {
            columns: { id: true, name: true, slug: true },
          },
        },
      });

      return allReviews;
    }),

  // Admin: Approve/reject a review
  adminUpdateStatus: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        isApproved: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updatedReview] = await ctx.db
        .update(reviews)
        .set({
          isApproved: input.isApproved,
          updatedAt: new Date(),
        })
        .where(eq(reviews.id, input.id))
        .returning();

      if (!updatedReview) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      return updatedReview;
    }),

  // Admin: Delete a review
  adminDelete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existingReview = await ctx.db.query.reviews.findFirst({
        where: eq(reviews.id, input.id),
      });

      if (!existingReview) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }

      await ctx.db.delete(reviews).where(eq(reviews.id, input.id));

      return { success: true };
    }),
});
