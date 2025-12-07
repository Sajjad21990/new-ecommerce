import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc";
import {
  carts,
  cartItems,
  products,
  productVariants,
  productImages,
  coupons,
} from "@/server/db/schema";
import { TRPCError } from "@trpc/server";

export const cartRouter = createTRPCRouter({
  // Get current user's cart
  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Get or create cart
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

    if (!cart) {
      const [newCart] = await ctx.db
        .insert(carts)
        .values({ userId })
        .returning();

      return {
        ...newCart,
        items: [],
        subtotal: 0,
        itemCount: 0,
      };
    }

    // Calculate totals
    const subtotal = cart.items.reduce((total, item) => {
      const price = item.variant?.price
        ? parseFloat(item.variant.price)
        : item.product.salePrice
          ? parseFloat(item.product.salePrice)
          : parseFloat(item.product.basePrice);
      return total + price * item.quantity;
    }, 0);

    const itemCount = cart.items.reduce((count, item) => count + item.quantity, 0);

    return {
      ...cart,
      subtotal,
      itemCount,
    };
  }),

  // Add item to cart
  add: protectedProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        quantity: z.number().min(1).default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Validate product exists and is active
      const product = await ctx.db.query.products.findFirst({
        where: and(eq(products.id, input.productId), eq(products.isActive, true)),
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      // Validate variant if provided
      if (input.variantId) {
        const variant = await ctx.db.query.productVariants.findFirst({
          where: and(
            eq(productVariants.id, input.variantId),
            eq(productVariants.productId, input.productId),
            eq(productVariants.isActive, true)
          ),
        });

        if (!variant) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Product variant not found",
          });
        }

        // Check stock
        if (variant.stock < input.quantity) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Insufficient stock",
          });
        }
      }

      // Get or create cart
      let cart = await ctx.db.query.carts.findFirst({
        where: eq(carts.userId, userId),
      });

      if (!cart) {
        const [newCart] = await ctx.db
          .insert(carts)
          .values({ userId })
          .returning();
        cart = newCart;
      }

      // Check if item already exists in cart
      const existingItem = await ctx.db.query.cartItems.findFirst({
        where: and(
          eq(cartItems.cartId, cart.id),
          eq(cartItems.productId, input.productId),
          input.variantId
            ? eq(cartItems.variantId, input.variantId)
            : isNull(cartItems.variantId)
        ),
      });

      if (existingItem) {
        // Update quantity
        const [updatedItem] = await ctx.db
          .update(cartItems)
          .set({ quantity: existingItem.quantity + input.quantity })
          .where(eq(cartItems.id, existingItem.id))
          .returning();

        return updatedItem;
      } else {
        // Add new item
        const [newItem] = await ctx.db
          .insert(cartItems)
          .values({
            cartId: cart.id,
            productId: input.productId,
            variantId: input.variantId,
            quantity: input.quantity,
          })
          .returning();

        return newItem;
      }
    }),

  // Update item quantity
  updateQuantity: protectedProcedure
    .input(
      z.object({
        itemId: z.string().uuid(),
        quantity: z.number().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify item belongs to user's cart
      const cart = await ctx.db.query.carts.findFirst({
        where: eq(carts.userId, userId),
      });

      if (!cart) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cart not found",
        });
      }

      const item = await ctx.db.query.cartItems.findFirst({
        where: and(
          eq(cartItems.id, input.itemId),
          eq(cartItems.cartId, cart.id)
        ),
        with: { variant: true },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cart item not found",
        });
      }

      // Check stock if variant
      if (item.variant && item.variant.stock < input.quantity) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient stock",
        });
      }

      const [updatedItem] = await ctx.db
        .update(cartItems)
        .set({ quantity: input.quantity })
        .where(eq(cartItems.id, input.itemId))
        .returning();

      return updatedItem;
    }),

  // Remove item from cart
  remove: protectedProcedure
    .input(z.object({ itemId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const cart = await ctx.db.query.carts.findFirst({
        where: eq(carts.userId, userId),
      });

      if (!cart) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cart not found",
        });
      }

      await ctx.db
        .delete(cartItems)
        .where(and(eq(cartItems.id, input.itemId), eq(cartItems.cartId, cart.id)));

      return { success: true };
    }),

  // Clear cart
  clear: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const cart = await ctx.db.query.carts.findFirst({
      where: eq(carts.userId, userId),
    });

    if (cart) {
      await ctx.db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    }

    return { success: true };
  }),

  // Apply coupon
  applyCoupon: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const coupon = await ctx.db.query.coupons.findFirst({
        where: and(
          eq(coupons.code, input.code.toUpperCase()),
          eq(coupons.isActive, true)
        ),
      });

      if (!coupon) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid coupon code",
        });
      }

      // Check validity dates
      const now = new Date();
      if (coupon.validFrom && now < coupon.validFrom) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Coupon is not yet valid",
        });
      }
      if (coupon.validUntil && now > coupon.validUntil) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Coupon has expired",
        });
      }

      // Check usage limit
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Coupon usage limit reached",
        });
      }

      return coupon;
    }),
});
