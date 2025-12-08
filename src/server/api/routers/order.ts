import { z } from "zod";
import { eq, desc, and, inArray, sql, gte, lte, or } from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import {
  orders,
  orderItems,
  orderTimeline,
  users,
  settings,
} from "@/server/db/schema";
import { createRazorpayOrder, verifyPaymentSignature } from "@/lib/razorpay";
import {
  sendOrderConfirmationEmail,
  sendShippingUpdateEmail,
  sendOrderDeliveredEmail,
  sendOrderCancelledEmail,
  sendNewOrderAdminEmail,
} from "@/lib/email";
import { TRPCError } from "@trpc/server";

const addressSchema = z.object({
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  addressLine1: z.string(),
  addressLine2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
});

const cartItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable(),
  name: z.string(),
  sku: z.string().optional(),
  price: z.number(),
  quantity: z.number().min(1),
  size: z.string().optional(),
  color: z.string().optional(),
});

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

export const orderRouter = createTRPCRouter({
  // Create order and initiate payment
  create: protectedProcedure
    .input(
      z.object({
        items: z.array(cartItemSchema),
        shippingAddress: addressSchema,
        billingAddress: addressSchema.optional(),
        subtotal: z.number(),
        shipping: z.number(),
        discount: z.number().default(0),
        total: z.number(),
        couponCode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Generate order number
      const orderNumber = generateOrderNumber();

      // Create Razorpay order
      let razorpayOrder;
      try {
        razorpayOrder = await createRazorpayOrder({
          amount: input.total,
          receipt: orderNumber,
          notes: {
            userId,
            orderNumber,
          },
        });
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create payment order",
        });
      }

      // Create order in database
      const [order] = await ctx.db
        .insert(orders)
        .values({
          orderNumber,
          userId,
          status: "pending",
          paymentStatus: "pending",
          razorpayOrderId: razorpayOrder.id,
          subtotal: input.subtotal.toString(),
          discount: input.discount.toString(),
          shippingCost: input.shipping.toString(),
          tax: "0",
          total: input.total.toString(),
          shippingAddress: input.shippingAddress,
          billingAddress: input.billingAddress || input.shippingAddress,
        })
        .returning();

      // Create order items
      await ctx.db.insert(orderItems).values(
        input.items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          name: item.name,
          sku: item.sku || "",
          price: item.price.toString(),
          quantity: item.quantity,
          size: item.size,
          color: item.color,
          total: (item.price * item.quantity).toString(),
        }))
      );

      // Add timeline entry for order creation
      await ctx.db.insert(orderTimeline).values({
        orderId: order.id,
        type: "status_change",
        title: "Order Created",
        description: `Order ${orderNumber} was placed`,
        metadata: { status: "pending", paymentStatus: "pending" },
        isPublic: true,
        createdBy: userId,
      });

      return {
        orderId: order.id,
        orderNumber,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      };
    }),

  // Guest checkout - Create order without authentication
  createGuest: publicProcedure
    .input(
      z.object({
        items: z.array(cartItemSchema),
        shippingAddress: addressSchema,
        billingAddress: addressSchema.optional(),
        subtotal: z.number(),
        shipping: z.number(),
        discount: z.number().default(0),
        total: z.number(),
        couponCode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Generate order number
      const orderNumber = generateOrderNumber();

      // Create Razorpay order
      let razorpayOrder;
      try {
        razorpayOrder = await createRazorpayOrder({
          amount: input.total,
          receipt: orderNumber,
          notes: {
            guestEmail: input.shippingAddress.email,
            orderNumber,
          },
        });
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create payment order",
        });
      }

      // Create order in database WITHOUT userId (guest order)
      const [order] = await ctx.db
        .insert(orders)
        .values({
          orderNumber,
          userId: null, // Guest order - no user ID
          guestEmail: input.shippingAddress.email, // Store guest email for lookup
          status: "pending",
          paymentStatus: "pending",
          razorpayOrderId: razorpayOrder.id,
          subtotal: input.subtotal.toString(),
          discount: input.discount.toString(),
          shippingCost: input.shipping.toString(),
          tax: "0",
          total: input.total.toString(),
          shippingAddress: input.shippingAddress,
          billingAddress: input.billingAddress || input.shippingAddress,
        })
        .returning();

      // Create order items
      await ctx.db.insert(orderItems).values(
        input.items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          name: item.name,
          sku: item.sku || "",
          price: item.price.toString(),
          quantity: item.quantity,
          size: item.size,
          color: item.color,
          total: (item.price * item.quantity).toString(),
        }))
      );

      // Add timeline entry for order creation
      await ctx.db.insert(orderTimeline).values({
        orderId: order.id,
        type: "status_change",
        title: "Order Created",
        description: `Guest order ${orderNumber} was placed`,
        metadata: { status: "pending", paymentStatus: "pending", isGuest: true },
        isPublic: true,
      });

      return {
        orderId: order.id,
        orderNumber,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      };
    }),

  // Verify payment (works for both logged-in and guest users)
  verifyPayment: publicProcedure
    .input(
      z.object({
        orderId: z.string().uuid(),
        razorpayOrderId: z.string(),
        razorpayPaymentId: z.string(),
        razorpaySignature: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify signature
      const isValid = verifyPaymentSignature({
        orderId: input.razorpayOrderId,
        paymentId: input.razorpayPaymentId,
        signature: input.razorpaySignature,
      });

      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid payment signature",
        });
      }

      // Update order
      const [updatedOrder] = await ctx.db
        .update(orders)
        .set({
          status: "confirmed",
          paymentStatus: "paid",
          razorpayPaymentId: input.razorpayPaymentId,
          paymentMethod: "razorpay",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, input.orderId))
        .returning();

      // Add timeline entry for payment
      await ctx.db.insert(orderTimeline).values({
        orderId: input.orderId,
        type: "payment",
        title: "Payment Confirmed",
        description: `Payment received via Razorpay`,
        metadata: { paymentId: input.razorpayPaymentId, amount: updatedOrder.total },
        isPublic: true,
      });

      // Get order items for email
      const items = await ctx.db.query.orderItems.findMany({
        where: eq(orderItems.orderId, input.orderId),
      });

      // Send order confirmation email (async, don't await to not block response)
      const shippingAddress = updatedOrder.shippingAddress as {
        fullName: string;
        email: string;
        phone: string;
        addressLine1: string;
        addressLine2?: string;
        city: string;
        state: string;
        pincode: string;
      };

      sendOrderConfirmationEmail({
        orderNumber: updatedOrder.orderNumber,
        customerName: shippingAddress.fullName,
        customerEmail: shippingAddress.email,
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          color: item.color,
        })),
        subtotal: updatedOrder.subtotal,
        shipping: updatedOrder.shippingCost || "0",
        discount: updatedOrder.discount || "0",
        total: updatedOrder.total,
        shippingAddress,
        paymentMethod: "Razorpay",
      }).catch((err) => console.error("Failed to send order email:", err));

      // Send admin notification email
      const storeSettings = await ctx.db.query.settings.findFirst({
        where: eq(settings.key, "store"),
      });
      const adminEmail = (storeSettings?.value as { email?: string })?.email;
      if (adminEmail) {
        sendNewOrderAdminEmail({
          adminEmail,
          orderNumber: updatedOrder.orderNumber,
          customerName: shippingAddress.fullName,
          customerEmail: shippingAddress.email,
          total: updatedOrder.total,
          itemsCount: items.length,
        }).catch((err) => console.error("Failed to send admin notification:", err));
      }

      // TODO: Update product stock

      return {
        success: true,
        order: updatedOrder,
      };
    }),

  // Guest: Look up order by order number and email
  lookupGuestOrder: publicProcedure
    .input(
      z.object({
        orderNumber: z.string(),
        email: z.string().email(),
      })
    )
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.query.orders.findFirst({
        where: and(
          eq(orders.orderNumber, input.orderNumber),
          eq(orders.guestEmail, input.email)
        ),
        with: {
          items: {
            with: {
              product: {
                with: {
                  images: { limit: 1 },
                },
              },
            },
          },
          timeline: {
            where: eq(orderTimeline.isPublic, true),
            orderBy: desc(orderTimeline.createdAt),
          },
        },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found. Please check your order number and email.",
        });
      }

      return order;
    }),

  // Get user's orders
  getMyOrders: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const offset = (input.page - 1) * input.limit;

      const userOrders = await ctx.db.query.orders.findMany({
        where: eq(orders.userId, userId),
        orderBy: desc(orders.createdAt),
        limit: input.limit,
        offset,
        with: {
          items: true,
        },
      });

      return userOrders;
    }),

  // Get single order
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.query.orders.findFirst({
        where: and(
          eq(orders.id, input.id),
          eq(orders.userId, ctx.session.user.id)
        ),
        with: {
          items: {
            with: {
              product: {
                with: {
                  images: {
                    limit: 1,
                  },
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      return order;
    }),

  // Admin: Get all orders
  adminList: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: z
          .enum([
            "pending",
            "confirmed",
            "processing",
            "shipped",
            "delivered",
            "cancelled",
          ])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, status } = input;
      const offset = (page - 1) * limit;

      const conditions = status ? [eq(orders.status, status)] : [];

      // Fetch orders with items only (avoid lateral join issue with nullable userId)
      const allOrders = await ctx.db.query.orders.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: desc(orders.createdAt),
        limit,
        offset,
        with: {
          items: true,
        },
      });

      // Fetch users separately for orders that have a userId
      const userIds = allOrders
        .map((o) => o.userId)
        .filter((id): id is string => id !== null);

      const usersData =
        userIds.length > 0
          ? await ctx.db.query.users.findMany({
              where: inArray(users.id, userIds),
              columns: { id: true, name: true, email: true },
            })
          : [];

      const userMap = new Map(usersData.map((u) => [u.id, u]));

      // Combine orders with user data
      return allOrders.map((order) => ({
        ...order,
        user: order.userId ? userMap.get(order.userId) ?? null : null,
      }));
    }),

  // Admin: Update order status
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum([
          "pending",
          "confirmed",
          "processing",
          "shipped",
          "delivered",
          "cancelled",
        ]),
        trackingNumber: z.string().optional(),
        trackingUrl: z.string().url().optional(),
        notifyCustomer: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get current order to track status change
      const currentOrder = await ctx.db.query.orders.findFirst({
        where: eq(orders.id, input.id),
      });

      if (!currentOrder) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      const updateData: Record<string, unknown> = {
        status: input.status,
        updatedAt: new Date(),
      };

      // Add tracking info if provided
      if (input.trackingNumber) {
        updateData.trackingNumber = input.trackingNumber;
      }
      if (input.trackingUrl) {
        updateData.trackingUrl = input.trackingUrl;
      }

      // Set shipped/delivered timestamps
      if (input.status === "shipped" && !currentOrder.shippedAt) {
        updateData.shippedAt = new Date();
      }
      if (input.status === "delivered" && !currentOrder.deliveredAt) {
        updateData.deliveredAt = new Date();
      }

      const [updatedOrder] = await ctx.db
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, input.id))
        .returning();

      // Add timeline entry
      const statusTitles: Record<string, string> = {
        pending: "Order Pending",
        confirmed: "Order Confirmed",
        processing: "Processing Order",
        shipped: "Order Shipped",
        delivered: "Order Delivered",
        cancelled: "Order Cancelled",
      };

      await ctx.db.insert(orderTimeline).values({
        orderId: input.id,
        type: "status_change",
        title: statusTitles[input.status] || "Status Updated",
        description: `Order status changed from ${currentOrder.status} to ${input.status}`,
        metadata: {
          oldStatus: currentOrder.status,
          newStatus: input.status,
          trackingNumber: input.trackingNumber,
        },
        isPublic: true,
        createdBy: ctx.session.user.id,
      });

      // Send email notification if notifyCustomer is true
      if (input.notifyCustomer) {
        const shippingAddress = updatedOrder.shippingAddress as {
          fullName: string;
          email: string;
        };
        const customerEmail = updatedOrder.guestEmail || shippingAddress?.email;
        const customerName = shippingAddress?.fullName || "Customer";

        if (customerEmail) {
          if (input.status === "shipped") {
            sendShippingUpdateEmail({
              customerEmail,
              customerName,
              orderNumber: updatedOrder.orderNumber,
              trackingNumber: input.trackingNumber,
              trackingUrl: input.trackingUrl,
            }).catch((err) => console.error("Failed to send shipping email:", err));
          } else if (input.status === "delivered") {
            sendOrderDeliveredEmail({
              customerEmail,
              customerName,
              orderNumber: updatedOrder.orderNumber,
              orderId: updatedOrder.id,
            }).catch((err) => console.error("Failed to send delivered email:", err));
          } else if (input.status === "cancelled") {
            sendOrderCancelledEmail({
              customerEmail,
              customerName,
              orderNumber: updatedOrder.orderNumber,
              refundAmount: updatedOrder.paymentStatus === "paid" ? updatedOrder.total : undefined,
            }).catch((err) => console.error("Failed to send cancelled email:", err));
          }
        }
      }

      return updatedOrder;
    }),

  // Admin: Get order by ID (with timeline)
  adminGetById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.query.orders.findFirst({
        where: eq(orders.id, input.id),
        with: {
          user: {
            columns: { id: true, name: true, email: true, phone: true },
          },
          items: {
            with: {
              product: {
                with: {
                  images: { limit: 1 },
                },
              },
            },
          },
          timeline: {
            orderBy: desc(orderTimeline.createdAt),
            with: {
              creator: {
                columns: { id: true, name: true },
              },
            },
          },
        },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      return order;
    }),

  // Admin: Add note to order
  addNote: adminProcedure
    .input(
      z.object({
        orderId: z.string().uuid(),
        note: z.string().min(1),
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Add to timeline
      await ctx.db.insert(orderTimeline).values({
        orderId: input.orderId,
        type: "note",
        title: input.isPublic ? "Note Added" : "Internal Note",
        description: input.note,
        isPublic: input.isPublic,
        createdBy: ctx.session.user.id,
      });

      // Also update admin notes field if internal note
      if (!input.isPublic) {
        const order = await ctx.db.query.orders.findFirst({
          where: eq(orders.id, input.orderId),
          columns: { adminNotes: true },
        });

        const existingNotes = order?.adminNotes || "";
        const timestamp = new Date().toISOString();
        const newNote = `[${timestamp}] ${input.note}`;

        await ctx.db
          .update(orders)
          .set({
            adminNotes: existingNotes ? `${existingNotes}\n${newNote}` : newNote,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, input.orderId));
      }

      return { success: true };
    }),

  // Admin: Update tracking info
  updateTracking: adminProcedure
    .input(
      z.object({
        orderId: z.string().uuid(),
        trackingNumber: z.string(),
        trackingUrl: z.string().url().optional(),
        carrier: z.string().optional(),
        notifyCustomer: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updatedOrder] = await ctx.db
        .update(orders)
        .set({
          trackingNumber: input.trackingNumber,
          trackingUrl: input.trackingUrl,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, input.orderId))
        .returning();

      // Add timeline entry
      await ctx.db.insert(orderTimeline).values({
        orderId: input.orderId,
        type: "note",
        title: "Tracking Updated",
        description: `Tracking number: ${input.trackingNumber}${input.carrier ? ` (${input.carrier})` : ""}`,
        metadata: { trackingNumber: input.trackingNumber, trackingUrl: input.trackingUrl, carrier: input.carrier },
        isPublic: true,
        createdBy: ctx.session.user.id,
      });

      // Send tracking email if notifyCustomer is true
      if (input.notifyCustomer) {
        const shippingAddress = updatedOrder.shippingAddress as {
          fullName: string;
          email: string;
        };
        const customerEmail = updatedOrder.guestEmail || shippingAddress?.email;
        const customerName = shippingAddress?.fullName || "Customer";

        if (customerEmail) {
          sendShippingUpdateEmail({
            customerEmail,
            customerName,
            orderNumber: updatedOrder.orderNumber,
            trackingNumber: input.trackingNumber,
            trackingUrl: input.trackingUrl,
            carrier: input.carrier,
          }).catch((err) => console.error("Failed to send tracking email:", err));
        }
      }

      return updatedOrder;
    }),

  // Admin: Bulk update order status
  bulkUpdateStatus: adminProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()),
        status: z.enum([
          "pending",
          "confirmed",
          "processing",
          "shipped",
          "delivered",
          "cancelled",
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(orders)
        .set({
          status: input.status,
          updatedAt: new Date(),
        })
        .where(inArray(orders.id, input.ids));

      // Add timeline entries for each order
      for (const orderId of input.ids) {
        await ctx.db.insert(orderTimeline).values({
          orderId,
          type: "status_change",
          title: "Bulk Status Update",
          description: `Status changed to ${input.status}`,
          metadata: { newStatus: input.status, bulkUpdate: true },
          isPublic: true,
          createdBy: ctx.session.user.id,
        });
      }

      return { success: true, count: input.ids.length };
    }),

  // Admin: Export orders
  export: adminProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        status: z
          .enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"])
          .optional(),
        ids: z.array(z.string().uuid()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input.ids && input.ids.length > 0) {
        conditions.push(inArray(orders.id, input.ids));
      }
      if (input.status) {
        conditions.push(eq(orders.status, input.status));
      }
      if (input.startDate) {
        conditions.push(gte(orders.createdAt, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(orders.createdAt, input.endDate));
      }

      const orderList = await ctx.db.query.orders.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: desc(orders.createdAt),
        with: {
          user: { columns: { name: true, email: true } },
          items: true,
        },
      });

      return orderList.map((o) => ({
        orderNumber: o.orderNumber,
        customerName: o.user?.name || "",
        customerEmail: o.user?.email || "",
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        subtotal: o.subtotal,
        discount: o.discount,
        shippingCost: o.shippingCost,
        total: o.total,
        itemCount: o.items.length,
        trackingNumber: o.trackingNumber,
        shippingAddress: o.shippingAddress,
        createdAt: o.createdAt,
        shippedAt: o.shippedAt,
        deliveredAt: o.deliveredAt,
      }));
    }),

  // Admin: Get order statistics
  getStats: adminProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.startDate) {
        conditions.push(gte(orders.createdAt, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(orders.createdAt, input.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Total orders and revenue
      const totals = await ctx.db
        .select({
          count: sql<number>`count(*)`,
          revenue: sql<number>`sum(CAST(${orders.total} AS DECIMAL))`,
        })
        .from(orders)
        .where(whereClause);

      // Orders by status
      const byStatus = await ctx.db
        .select({
          status: orders.status,
          count: sql<number>`count(*)`,
        })
        .from(orders)
        .where(whereClause)
        .groupBy(orders.status);

      // Paid orders
      const paidOrders = await ctx.db
        .select({
          count: sql<number>`count(*)`,
          revenue: sql<number>`sum(CAST(${orders.total} AS DECIMAL))`,
        })
        .from(orders)
        .where(
          whereClause
            ? and(whereClause, eq(orders.paymentStatus, "paid"))
            : eq(orders.paymentStatus, "paid")
        );

      return {
        totalOrders: Number(totals[0]?.count ?? 0),
        totalRevenue: Number(totals[0]?.revenue ?? 0),
        paidOrders: Number(paidOrders[0]?.count ?? 0),
        paidRevenue: Number(paidOrders[0]?.revenue ?? 0),
        byStatus: byStatus.reduce(
          (acc, s) => {
            acc[s.status] = Number(s.count);
            return acc;
          },
          {} as Record<string, number>
        ),
      };
    }),
});
