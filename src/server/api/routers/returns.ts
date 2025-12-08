import { z } from "zod";
import { eq, desc, and, inArray } from "drizzle-orm";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { orderReturns, orders, orderTimeline, orderItems, users } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";
import { sendReturnRequestedEmail, sendReturnStatusUpdateEmail } from "@/lib/email";

const returnReasonEnum = z.enum([
  "defective",
  "wrong_item",
  "not_as_described",
  "changed_mind",
  "size_issue",
  "other",
]);

const returnStatusEnum = z.enum([
  "requested",
  "approved",
  "rejected",
  "shipped",
  "received",
  "refunded",
  "completed",
]);

function generateReturnNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RMA-${timestamp}-${random}`;
}

export const returnsRouter = createTRPCRouter({
  // Customer: Request a return
  create: protectedProcedure
    .input(
      z.object({
        orderId: z.string().uuid(),
        reason: returnReasonEnum,
        reasonDetails: z.string().optional(),
        items: z.array(
          z.object({
            orderItemId: z.string().uuid(),
            quantity: z.number().min(1),
            reason: z.string().optional(),
          })
        ),
        customerNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify order belongs to user and is delivered
      const order = await ctx.db.query.orders.findFirst({
        where: and(
          eq(orders.id, input.orderId),
          eq(orders.userId, userId)
        ),
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      if (order.status !== "delivered") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Returns can only be requested for delivered orders",
        });
      }

      // Check if return already exists for this order
      const existingReturn = await ctx.db.query.orderReturns.findFirst({
        where: and(
          eq(orderReturns.orderId, input.orderId),
          eq(orderReturns.userId, userId)
        ),
      });

      if (existingReturn) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A return request already exists for this order",
        });
      }

      // Create return request
      const [returnRequest] = await ctx.db
        .insert(orderReturns)
        .values({
          returnNumber: generateReturnNumber(),
          orderId: input.orderId,
          userId,
          reason: input.reason,
          reasonDetails: input.reasonDetails,
          items: input.items,
          customerNotes: input.customerNotes,
        })
        .returning();

      // Add to order timeline
      await ctx.db.insert(orderTimeline).values({
        orderId: input.orderId,
        type: "note",
        title: "Return Requested",
        description: `Return request ${returnRequest.returnNumber} submitted`,
        metadata: { returnId: returnRequest.id, reason: input.reason },
        isPublic: true,
        createdBy: userId,
      });

      // Get user and order items for email
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      const orderItemsList = await ctx.db.query.orderItems.findMany({
        where: eq(orderItems.orderId, input.orderId),
      });

      // Map return item IDs to actual item names
      const returnItemDetails = input.items.map((item) => {
        const orderItem = orderItemsList.find((oi) => oi.id === item.orderItemId);
        return {
          name: orderItem?.name || "Unknown Product",
          quantity: item.quantity,
        };
      });

      // Format reason for display
      const reasonLabels: Record<string, string> = {
        defective: "Product is defective",
        wrong_item: "Wrong item received",
        not_as_described: "Item not as described",
        changed_mind: "Changed my mind",
        size_issue: "Size doesn't fit",
        other: "Other reason",
      };

      // Send return requested email
      if (user?.email) {
        sendReturnRequestedEmail({
          customerEmail: user.email,
          customerName: user.name || "Customer",
          returnNumber: returnRequest.returnNumber,
          orderNumber: order.orderNumber,
          reason: reasonLabels[input.reason] || input.reason,
          items: returnItemDetails,
        }).catch((err) => console.error("Failed to send return requested email:", err));
      }

      return returnRequest;
    }),

  // Customer: Get their returns
  getMyReturns: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    return ctx.db.query.orderReturns.findMany({
      where: eq(orderReturns.userId, userId),
      orderBy: desc(orderReturns.createdAt),
      with: {
        order: {
          columns: { id: true, orderNumber: true },
        },
      },
    });
  }),

  // Customer: Get single return
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const returnRequest = await ctx.db.query.orderReturns.findFirst({
        where: and(
          eq(orderReturns.id, input.id),
          eq(orderReturns.userId, userId)
        ),
        with: {
          order: {
            with: {
              items: true,
            },
          },
        },
      });

      if (!returnRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Return request not found",
        });
      }

      return returnRequest;
    }),

  // Admin: Get all returns
  adminList: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: returnStatusEnum.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, status } = input;
      const offset = (page - 1) * limit;

      const conditions = status ? [eq(orderReturns.status, status)] : [];

      return ctx.db.query.orderReturns.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: desc(orderReturns.createdAt),
        limit,
        offset,
        with: {
          user: {
            columns: { id: true, name: true, email: true },
          },
          order: {
            columns: { id: true, orderNumber: true, total: true },
          },
        },
      });
    }),

  // Admin: Get single return with full details
  adminGetById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const returnRequest = await ctx.db.query.orderReturns.findFirst({
        where: eq(orderReturns.id, input.id),
        with: {
          user: {
            columns: { id: true, name: true, email: true, phone: true },
          },
          order: {
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
            },
          },
          approver: {
            columns: { id: true, name: true },
          },
        },
      });

      if (!returnRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Return request not found",
        });
      }

      return returnRequest;
    }),

  // Admin: Update return status
  adminUpdateStatus: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: returnStatusEnum,
        refundAmount: z.number().optional(),
        refundMethod: z.enum(["original_payment", "store_credit"]).optional(),
        adminNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentReturn = await ctx.db.query.orderReturns.findFirst({
        where: eq(orderReturns.id, input.id),
      });

      if (!currentReturn) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Return request not found",
        });
      }

      const updateData: Record<string, unknown> = {
        status: input.status,
        updatedAt: new Date(),
      };

      if (input.refundAmount !== undefined) {
        updateData.refundAmount = input.refundAmount.toString();
      }
      if (input.refundMethod) {
        updateData.refundMethod = input.refundMethod;
      }
      if (input.adminNotes) {
        const existingNotes = currentReturn.adminNotes || "";
        const timestamp = new Date().toISOString();
        updateData.adminNotes = existingNotes
          ? `${existingNotes}\n[${timestamp}] ${input.adminNotes}`
          : `[${timestamp}] ${input.adminNotes}`;
      }

      // Set approval info if approved
      if (input.status === "approved" && currentReturn.status !== "approved") {
        updateData.approvedAt = new Date();
        updateData.approvedBy = ctx.session.user.id;
      }

      // Set completion timestamp
      if (input.status === "completed" && currentReturn.status !== "completed") {
        updateData.completedAt = new Date();
      }

      const [updatedReturn] = await ctx.db
        .update(orderReturns)
        .set(updateData)
        .where(eq(orderReturns.id, input.id))
        .returning();

      // Add to order timeline
      const statusTitles: Record<string, string> = {
        requested: "Return Requested",
        approved: "Return Approved",
        rejected: "Return Rejected",
        shipped: "Return Items Shipped",
        received: "Return Items Received",
        refunded: "Refund Processed",
        completed: "Return Completed",
      };

      await ctx.db.insert(orderTimeline).values({
        orderId: currentReturn.orderId,
        type: "note",
        title: statusTitles[input.status] || "Return Updated",
        description: `Return ${currentReturn.returnNumber} status: ${input.status}`,
        metadata: {
          returnId: input.id,
          oldStatus: currentReturn.status,
          newStatus: input.status,
          refundAmount: input.refundAmount,
        },
        isPublic: true,
        createdBy: ctx.session.user.id,
      });

      // Send email notification to customer for key status changes
      if (["approved", "rejected", "refunded"].includes(input.status)) {
        const user = await ctx.db.query.users.findFirst({
          where: eq(users.id, currentReturn.userId),
        });
        const order = await ctx.db.query.orders.findFirst({
          where: eq(orders.id, currentReturn.orderId),
        });

        if (user?.email && order) {
          sendReturnStatusUpdateEmail({
            customerEmail: user.email,
            customerName: user.name || "Customer",
            returnNumber: currentReturn.returnNumber,
            orderNumber: order.orderNumber,
            status: input.status as "approved" | "rejected" | "refunded",
            refundAmount: input.refundAmount,
            rejectionReason: input.status === "rejected" ? input.adminNotes : undefined,
            instructions: input.status === "approved"
              ? "Please ship your return items to our warehouse. You will receive a refund once we receive and inspect the items."
              : undefined,
          }).catch((err) => console.error("Failed to send return status email:", err));
        }
      }

      return updatedReturn;
    }),

  // Admin: Bulk update return status
  adminBulkUpdateStatus: adminProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()),
        status: returnStatusEnum,
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(orderReturns)
        .set({
          status: input.status,
          updatedAt: new Date(),
        })
        .where(inArray(orderReturns.id, input.ids));

      return { success: true, count: input.ids.length };
    }),
});
