import { z } from "zod";
import { eq, and, lt, desc, isNull } from "drizzle-orm";
import { createTRPCRouter, publicProcedure, adminProcedure } from "@/server/api/trpc";
import {
  abandonedCarts,
  carts,
  cartItems,
  users,
  products,
  productVariants,
  productImages,
} from "@/server/db/schema";
import { TRPCError } from "@trpc/server";
import { sendAbandonedCartEmail } from "@/lib/email";
import { randomBytes } from "crypto";

const STORE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Generate a unique recovery token
function generateRecoveryToken(): string {
  return randomBytes(32).toString("hex");
}

export const abandonedCartRouter = createTRPCRouter({
  // Capture abandoned cart (called by cron job or when user leaves checkout)
  capture: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid().optional(),
        email: z.string().email(),
        cartData: z.array(
          z.object({
            productId: z.string().uuid(),
            variantId: z.string().uuid().nullable(),
            name: z.string(),
            price: z.number(),
            quantity: z.number(),
            image: z.string().optional(),
          })
        ),
        totalValue: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if an abandoned cart already exists for this email
      const existing = await ctx.db.query.abandonedCarts.findFirst({
        where: and(
          eq(abandonedCarts.email, input.email),
          eq(abandonedCarts.recovered, false)
        ),
      });

      if (existing) {
        // Update existing abandoned cart
        const [updated] = await ctx.db
          .update(abandonedCarts)
          .set({
            cartData: input.cartData,
            totalValue: input.totalValue.toString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          })
          .where(eq(abandonedCarts.id, existing.id))
          .returning();

        return updated;
      }

      // Create new abandoned cart record
      const [abandonedCart] = await ctx.db
        .insert(abandonedCarts)
        .values({
          email: input.email,
          userId: input.userId,
          cartData: input.cartData,
          totalValue: input.totalValue.toString(),
          recoveryToken: generateRecoveryToken(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        })
        .returning();

      return abandonedCart;
    }),

  // Capture cart for authenticated user (for use in checkout flow)
  captureMyCart: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // This endpoint is for capturing cart during checkout if user abandons
      // Get cart items with product details
      const userId = ctx.session?.user?.id;

      if (!userId) {
        // For guest users, we can't capture cart since they don't have one in DB
        return { success: false, message: "Guest carts not supported yet" };
      }

      const cart = await ctx.db.query.carts.findFirst({
        where: eq(carts.userId, userId),
        with: {
          items: {
            with: {
              product: {
                with: {
                  images: {
                    where: eq(productImages.isPrimary, true),
                    limit: 1,
                  },
                },
              },
              variant: true,
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        return { success: false, message: "Cart is empty" };
      }

      // Calculate total and prepare cart data
      const cartData = cart.items.map((item) => {
        const price = item.variant?.price
          ? parseFloat(item.variant.price)
          : item.product.salePrice
            ? parseFloat(item.product.salePrice)
            : parseFloat(item.product.basePrice);

        return {
          productId: item.productId,
          variantId: item.variantId,
          name: item.product.name,
          price,
          quantity: item.quantity,
          image: item.product.images[0]?.url,
          size: item.variant?.size,
          color: item.variant?.color,
        };
      });

      const totalValue = cartData.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // Check for existing abandoned cart
      const existing = await ctx.db.query.abandonedCarts.findFirst({
        where: and(
          eq(abandonedCarts.email, input.email),
          eq(abandonedCarts.recovered, false)
        ),
      });

      if (existing) {
        // Update existing
        await ctx.db
          .update(abandonedCarts)
          .set({
            cartData,
            totalValue: totalValue.toString(),
            userId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          })
          .where(eq(abandonedCarts.id, existing.id));

        return { success: true, id: existing.id };
      }

      // Create new
      const [abandonedCart] = await ctx.db
        .insert(abandonedCarts)
        .values({
          email: input.email,
          userId,
          cartData,
          totalValue: totalValue.toString(),
          recoveryToken: generateRecoveryToken(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })
        .returning();

      return { success: true, id: abandonedCart.id };
    }),

  // Recover cart via token (public - accessed from recovery email link)
  recover: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const abandonedCart = await ctx.db.query.abandonedCarts.findFirst({
        where: eq(abandonedCarts.recoveryToken, input.token),
      });

      if (!abandonedCart) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid or expired recovery link",
        });
      }

      // Check if expired
      if (abandonedCart.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This recovery link has expired",
        });
      }

      // Check if already recovered
      if (abandonedCart.recovered) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This cart has already been recovered",
        });
      }

      return {
        id: abandonedCart.id,
        email: abandonedCart.email,
        cartData: abandonedCart.cartData as Array<{
          productId: string;
          variantId: string | null;
          name: string;
          price: number;
          quantity: number;
          image?: string;
          size?: string;
          color?: string;
        }>,
        totalValue: parseFloat(abandonedCart.totalValue),
      };
    }),

  // Mark cart as recovered (when user completes checkout after recovery)
  markRecovered: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(abandonedCarts)
        .set({
          recovered: true,
          recoveredAt: new Date(),
        })
        .where(eq(abandonedCarts.recoveryToken, input.token))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recovery token not found",
        });
      }

      return { success: true };
    }),

  // Admin: Get all abandoned carts
  adminList: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        recovered: z.boolean().optional(),
        emailSent: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, recovered, emailSent } = input;
      const offset = (page - 1) * limit;

      const conditions = [];

      if (recovered !== undefined) {
        conditions.push(eq(abandonedCarts.recovered, recovered));
      }

      if (emailSent !== undefined) {
        conditions.push(eq(abandonedCarts.recoveryEmailSent, emailSent));
      }

      const carts = await ctx.db.query.abandonedCarts.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: desc(abandonedCarts.createdAt),
        limit,
        offset,
        with: {
          user: {
            columns: { id: true, name: true, email: true },
          },
        },
      });

      return carts;
    }),

  // Admin: Send recovery email for specific cart
  adminSendRecoveryEmail: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const abandonedCart = await ctx.db.query.abandonedCarts.findFirst({
        where: eq(abandonedCarts.id, input.id),
        with: {
          user: {
            columns: { name: true },
          },
        },
      });

      if (!abandonedCart) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Abandoned cart not found",
        });
      }

      if (abandonedCart.recovered) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cart has already been recovered",
        });
      }

      const cartData = abandonedCart.cartData as Array<{
        name: string;
        price: number;
        quantity: number;
        image?: string;
      }>;

      const customerName = abandonedCart.user?.name || "Valued Customer";

      // Send the email
      const result = await sendAbandonedCartEmail({
        customerEmail: abandonedCart.email,
        customerName,
        items: cartData.map((item) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        })),
        totalValue: parseFloat(abandonedCart.totalValue),
        recoveryUrl: `${STORE_URL}/cart/recover?token=${abandonedCart.recoveryToken}`,
      });

      if (result.success) {
        // Update abandoned cart record
        await ctx.db
          .update(abandonedCarts)
          .set({
            recoveryEmailSent: true,
            recoveryEmailSentAt: new Date(),
          })
          .where(eq(abandonedCarts.id, input.id));

        return { success: true };
      } else {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send recovery email",
        });
      }
    }),

  // Admin: Get stats
  adminStats: adminProcedure.query(async ({ ctx }) => {
    const allCarts = await ctx.db.query.abandonedCarts.findMany();

    const total = allCarts.length;
    const recovered = allCarts.filter((c) => c.recovered).length;
    const emailsSent = allCarts.filter((c) => c.recoveryEmailSent).length;
    const pendingEmails = allCarts.filter((c) => !c.recoveryEmailSent && !c.recovered).length;
    const totalValue = allCarts.reduce((sum, c) => sum + parseFloat(c.totalValue), 0);
    const recoveredValue = allCarts
      .filter((c) => c.recovered)
      .reduce((sum, c) => sum + parseFloat(c.totalValue), 0);

    return {
      total,
      recovered,
      recoveryRate: total > 0 ? ((recovered / total) * 100).toFixed(1) : "0",
      emailsSent,
      pendingEmails,
      totalValue,
      recoveredValue,
    };
  }),

  // Process abandoned carts and send recovery emails (called by cron)
  processAbandonedCarts: adminProcedure
    .input(
      z.object({
        hoursThreshold: z.number().min(1).max(72).default(1), // Send email after X hours of abandonment
        limit: z.number().min(1).max(50).default(10), // Max emails to send per batch
      })
    )
    .mutation(async ({ ctx, input }) => {
      const thresholdDate = new Date(Date.now() - input.hoursThreshold * 60 * 60 * 1000);

      // Find carts that:
      // 1. Were created more than X hours ago
      // 2. Haven't had recovery email sent
      // 3. Aren't recovered yet
      // 4. Haven't expired
      const eligibleCarts = await ctx.db.query.abandonedCarts.findMany({
        where: and(
          lt(abandonedCarts.createdAt, thresholdDate),
          eq(abandonedCarts.recoveryEmailSent, false),
          eq(abandonedCarts.recovered, false)
        ),
        limit: input.limit,
        with: {
          user: {
            columns: { name: true },
          },
        },
      });

      // Filter out expired carts
      const validCarts = eligibleCarts.filter((c) => c.expiresAt > new Date());

      let sentCount = 0;
      const errors: string[] = [];

      for (const cart of validCarts) {
        const cartData = cart.cartData as Array<{
          name: string;
          price: number;
          quantity: number;
          image?: string;
        }>;

        const customerName = cart.user?.name || "Valued Customer";

        try {
          const result = await sendAbandonedCartEmail({
            customerEmail: cart.email,
            customerName,
            items: cartData.map((item) => ({
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              image: item.image,
            })),
            totalValue: parseFloat(cart.totalValue),
            recoveryUrl: `${STORE_URL}/cart/recover?token=${cart.recoveryToken}`,
          });

          if (result.success) {
            await ctx.db
              .update(abandonedCarts)
              .set({
                recoveryEmailSent: true,
                recoveryEmailSentAt: new Date(),
              })
              .where(eq(abandonedCarts.id, cart.id));

            sentCount++;
          } else {
            errors.push(`Failed to send to ${cart.email}`);
          }
        } catch (error) {
          errors.push(`Error sending to ${cart.email}: ${error}`);
        }
      }

      return {
        processed: validCarts.length,
        sent: sentCount,
        errors: errors.length > 0 ? errors : undefined,
      };
    }),

  // Clean up expired abandoned carts
  cleanupExpired: adminProcedure.mutation(async ({ ctx }) => {
    const result = await ctx.db
      .delete(abandonedCarts)
      .where(lt(abandonedCarts.expiresAt, new Date()));

    return { success: true };
  }),
});
