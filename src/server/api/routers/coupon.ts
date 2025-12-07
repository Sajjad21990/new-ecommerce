import { z } from "zod";
import { eq, desc, and, count, ilike, or, gte, lte } from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { coupons } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";

const couponSchema = z.object({
  code: z
    .string()
    .min(3, "Code must be at least 3 characters")
    .max(50, "Code must be at most 50 characters")
    .transform((val) => val.toUpperCase().replace(/\s/g, "")),
  type: z.enum(["percentage", "fixed"]),
  value: z.number().positive("Value must be positive"),
  minOrderAmount: z.number().min(0).optional().nullable(),
  maxDiscount: z.number().min(0).optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  validFrom: z.date().optional().nullable(),
  validUntil: z.date().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const couponRouter = createTRPCRouter({
  // Admin: List all coupons with pagination
  adminList: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        status: z.enum(["active", "inactive", "expired", "all"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, status } = input;
      const offset = (page - 1) * limit;
      const now = new Date();

      const conditions = [];

      if (search) {
        conditions.push(ilike(coupons.code, `%${search}%`));
      }

      if (status && status !== "all") {
        if (status === "active") {
          conditions.push(eq(coupons.isActive, true));
          conditions.push(
            or(
              lte(coupons.validFrom, now),
              eq(coupons.validFrom, null as unknown as Date)
            )
          );
          conditions.push(
            or(
              gte(coupons.validUntil, now),
              eq(coupons.validUntil, null as unknown as Date)
            )
          );
        } else if (status === "inactive") {
          conditions.push(eq(coupons.isActive, false));
        } else if (status === "expired") {
          conditions.push(lte(coupons.validUntil, now));
        }
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [couponList, totalCount] = await Promise.all([
        ctx.db.query.coupons.findMany({
          where: whereClause,
          orderBy: desc(coupons.createdAt),
          limit,
          offset,
        }),
        ctx.db.select({ count: count() }).from(coupons).where(whereClause),
      ]);

      return {
        coupons: couponList,
        total: totalCount[0]?.count || 0,
        page,
        limit,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
      };
    }),

  // Admin: Get single coupon
  adminGetById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const coupon = await ctx.db.query.coupons.findFirst({
        where: eq(coupons.id, input.id),
      });

      if (!coupon) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Coupon not found",
        });
      }

      return coupon;
    }),

  // Admin: Create coupon
  adminCreate: adminProcedure
    .input(couponSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if code already exists
      const existing = await ctx.db.query.coupons.findFirst({
        where: eq(coupons.code, input.code),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A coupon with this code already exists",
        });
      }

      // Validate dates
      if (input.validFrom && input.validUntil) {
        if (input.validFrom > input.validUntil) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Valid from date must be before valid until date",
          });
        }
      }

      // Validate percentage type
      if (input.type === "percentage" && input.value > 100) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Percentage discount cannot exceed 100%",
        });
      }

      const [newCoupon] = await ctx.db
        .insert(coupons)
        .values({
          code: input.code,
          type: input.type,
          value: input.value.toString(),
          minOrderAmount: input.minOrderAmount?.toString() || null,
          maxDiscount: input.maxDiscount?.toString() || null,
          usageLimit: input.usageLimit || null,
          validFrom: input.validFrom || null,
          validUntil: input.validUntil || null,
          isActive: input.isActive,
        })
        .returning();

      return newCoupon;
    }),

  // Admin: Update coupon
  adminUpdate: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: couponSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, data } = input;

      // Check if coupon exists
      const existing = await ctx.db.query.coupons.findFirst({
        where: eq(coupons.id, id),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Coupon not found",
        });
      }

      // If updating code, check for conflicts
      if (data.code && data.code !== existing.code) {
        const codeExists = await ctx.db.query.coupons.findFirst({
          where: eq(coupons.code, data.code),
        });

        if (codeExists) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A coupon with this code already exists",
          });
        }
      }

      // Validate dates
      const validFrom = data.validFrom ?? existing.validFrom;
      const validUntil = data.validUntil ?? existing.validUntil;
      if (validFrom && validUntil && validFrom > validUntil) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Valid from date must be before valid until date",
        });
      }

      // Validate percentage type
      const type = data.type ?? existing.type;
      const value = data.value ?? parseFloat(existing.value);
      if (type === "percentage" && value > 100) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Percentage discount cannot exceed 100%",
        });
      }

      const updateData: Record<string, unknown> = {};
      if (data.code !== undefined) updateData.code = data.code;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.value !== undefined) updateData.value = data.value.toString();
      if (data.minOrderAmount !== undefined)
        updateData.minOrderAmount = data.minOrderAmount?.toString() || null;
      if (data.maxDiscount !== undefined)
        updateData.maxDiscount = data.maxDiscount?.toString() || null;
      if (data.usageLimit !== undefined)
        updateData.usageLimit = data.usageLimit || null;
      if (data.validFrom !== undefined)
        updateData.validFrom = data.validFrom || null;
      if (data.validUntil !== undefined)
        updateData.validUntil = data.validUntil || null;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      const [updatedCoupon] = await ctx.db
        .update(coupons)
        .set(updateData)
        .where(eq(coupons.id, id))
        .returning();

      return updatedCoupon;
    }),

  // Admin: Delete coupon
  adminDelete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.coupons.findFirst({
        where: eq(coupons.id, input.id),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Coupon not found",
        });
      }

      // Don't allow deletion if coupon has been used
      if (existing.usedCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot delete a coupon that has been used. Deactivate it instead.",
        });
      }

      await ctx.db.delete(coupons).where(eq(coupons.id, input.id));

      return { success: true };
    }),

  // Admin: Toggle coupon status
  adminToggleStatus: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.coupons.findFirst({
        where: eq(coupons.id, input.id),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Coupon not found",
        });
      }

      const [updatedCoupon] = await ctx.db
        .update(coupons)
        .set({ isActive: !existing.isActive })
        .where(eq(coupons.id, input.id))
        .returning();

      return updatedCoupon;
    }),

  // Admin: Get coupon stats
  adminStats: adminProcedure.query(async ({ ctx }) => {
    const now = new Date();

    const allCoupons = await ctx.db.query.coupons.findMany();

    const totalCoupons = allCoupons.length;
    const activeCoupons = allCoupons.filter((c) => {
      if (!c.isActive) return false;
      if (c.validFrom && c.validFrom > now) return false;
      if (c.validUntil && c.validUntil < now) return false;
      if (c.usageLimit && c.usedCount >= c.usageLimit) return false;
      return true;
    }).length;
    const expiredCoupons = allCoupons.filter(
      (c) => c.validUntil && c.validUntil < now
    ).length;
    const totalUsage = allCoupons.reduce((sum, c) => sum + c.usedCount, 0);

    return {
      totalCoupons,
      activeCoupons,
      expiredCoupons,
      totalUsage,
    };
  }),

  // Public: Validate and calculate discount
  validate: publicProcedure
    .input(
      z.object({
        code: z.string().transform((val) => val.toUpperCase().replace(/\s/g, "")),
        orderTotal: z.number().positive(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { code, orderTotal } = input;
      const now = new Date();

      const coupon = await ctx.db.query.coupons.findFirst({
        where: eq(coupons.code, code),
      });

      if (!coupon) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid coupon code",
        });
      }

      // Check if active
      if (!coupon.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This coupon is no longer active",
        });
      }

      // Check validity period
      if (coupon.validFrom && coupon.validFrom > now) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This coupon is not yet valid",
        });
      }

      if (coupon.validUntil && coupon.validUntil < now) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This coupon has expired",
        });
      }

      // Check usage limit
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This coupon has reached its usage limit",
        });
      }

      // Check minimum order amount
      const minOrderAmount = coupon.minOrderAmount
        ? parseFloat(coupon.minOrderAmount)
        : 0;
      if (orderTotal < minOrderAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Minimum order amount of ₹${minOrderAmount} required`,
        });
      }

      // Calculate discount
      const couponValue = parseFloat(coupon.value);
      let discount = 0;

      if (coupon.type === "percentage") {
        discount = (orderTotal * couponValue) / 100;
      } else {
        discount = couponValue;
      }

      // Apply max discount cap if set
      const maxDiscount = coupon.maxDiscount
        ? parseFloat(coupon.maxDiscount)
        : null;
      if (maxDiscount && discount > maxDiscount) {
        discount = maxDiscount;
      }

      // Discount cannot exceed order total
      if (discount > orderTotal) {
        discount = orderTotal;
      }

      return {
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          type: coupon.type,
          value: couponValue,
        },
        discount: Math.round(discount * 100) / 100,
        newTotal: Math.round((orderTotal - discount) * 100) / 100,
      };
    }),

  // Increment usage (called after order is placed)
  incrementUsage: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const coupon = await ctx.db.query.coupons.findFirst({
        where: eq(coupons.id, input.id),
      });

      if (!coupon) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Coupon not found",
        });
      }

      await ctx.db
        .update(coupons)
        .set({ usedCount: coupon.usedCount + 1 })
        .where(eq(coupons.id, input.id));

      return { success: true };
    }),
});
