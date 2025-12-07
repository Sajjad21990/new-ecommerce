import { z } from "zod";
import { eq, desc, and, count, sql, ilike, or, inArray } from "drizzle-orm";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { users, orders, reviews, addresses, orderItems, products } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";

export const userRouter = createTRPCRouter({
  // Admin: Get all customers with pagination and search
  adminList: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        role: z.enum(["customer", "admin"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, role } = input;
      const offset = (page - 1) * limit;

      const conditions = [];

      if (search) {
        conditions.push(
          or(
            ilike(users.name, `%${search}%`),
            ilike(users.email, `%${search}%`)
          )
        );
      }

      if (role) {
        conditions.push(eq(users.role, role));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [customerList, totalCount] = await Promise.all([
        ctx.db.query.users.findMany({
          where: whereClause,
          orderBy: desc(users.createdAt),
          limit,
          offset,
          columns: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            image: true,
            tags: true,
            createdAt: true,
          },
        }),
        ctx.db
          .select({ count: count() })
          .from(users)
          .where(whereClause),
      ]);

      return {
        customers: customerList,
        total: totalCount[0]?.count || 0,
        page,
        limit,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
      };
    }),

  // Admin: Get single customer with details
  adminGetById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Fetch user basic info
      const customer = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.id),
        columns: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          image: true,
          tags: true,
          adminNotes: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      // Fetch addresses separately
      const customerAddresses = await ctx.db.query.addresses.findMany({
        where: eq(addresses.userId, input.id),
      });

      // Fetch orders separately
      const customerOrders = await ctx.db.query.orders.findMany({
        where: eq(orders.userId, input.id),
        orderBy: desc(orders.createdAt),
        limit: 10,
      });

      // Fetch order items for these orders
      const orderIds = customerOrders.map((o) => o.id);
      const customerOrderItems =
        orderIds.length > 0
          ? await ctx.db.query.orderItems.findMany({
              where: inArray(orderItems.orderId, orderIds),
            })
          : [];

      // Group items by order
      const itemsByOrder = new Map<string, typeof customerOrderItems>();
      for (const item of customerOrderItems) {
        if (!itemsByOrder.has(item.orderId)) {
          itemsByOrder.set(item.orderId, []);
        }
        itemsByOrder.get(item.orderId)!.push(item);
      }

      // Combine orders with items
      const ordersWithItems = customerOrders.map((order) => ({
        ...order,
        items: itemsByOrder.get(order.id) || [],
      }));

      // Fetch reviews separately
      const customerReviews = await ctx.db.query.reviews.findMany({
        where: eq(reviews.userId, input.id),
        orderBy: desc(reviews.createdAt),
        limit: 5,
      });

      // Fetch products for reviews
      const productIds = customerReviews.map((r) => r.productId);
      const reviewProducts =
        productIds.length > 0
          ? await ctx.db.query.products.findMany({
              where: inArray(products.id, productIds),
              columns: { id: true, name: true, slug: true },
            })
          : [];

      const productMap = new Map(reviewProducts.map((p) => [p.id, p]));

      // Combine reviews with products
      const reviewsWithProducts = customerReviews.map((review) => ({
        ...review,
        product: productMap.get(review.productId) || null,
      }));

      // Get order statistics
      const orderStats = await ctx.db
        .select({
          totalOrders: count(),
          totalSpent: sql<string>`COALESCE(SUM(CAST(${orders.total} AS DECIMAL)), 0)`,
        })
        .from(orders)
        .where(and(eq(orders.userId, input.id), eq(orders.paymentStatus, "paid")));

      return {
        ...customer,
        addresses: customerAddresses,
        orders: ordersWithItems,
        reviews: reviewsWithProducts,
        stats: {
          totalOrders: orderStats[0]?.totalOrders || 0,
          totalSpent: parseFloat(orderStats[0]?.totalSpent || "0"),
        },
      };
    }),

  // Admin: Update customer role
  adminUpdateRole: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        role: z.enum(["customer", "admin"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent self-demotion
      if (ctx.session.user.id === input.id && input.role !== "admin") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot change your own role",
        });
      }

      const [updatedUser] = await ctx.db
        .update(users)
        .set({
          role: input.role,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.id))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        });

      if (!updatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return updatedUser;
    }),

  // Admin: Get customer stats summary
  adminStats: adminProcedure.query(async ({ ctx }) => {
    const [totalCustomers, newThisMonth, totalAdmins] = await Promise.all([
      ctx.db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, "customer")),
      ctx.db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.role, "customer"),
            sql`${users.createdAt} >= date_trunc('month', CURRENT_DATE)`
          )
        ),
      ctx.db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, "admin")),
    ]);

    return {
      totalCustomers: totalCustomers[0]?.count || 0,
      newThisMonth: newThisMonth[0]?.count || 0,
      totalAdmins: totalAdmins[0]?.count || 0,
    };
  }),

  // Admin: Update customer tags
  adminUpdateTags: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        tags: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updatedUser] = await ctx.db
        .update(users)
        .set({
          tags: input.tags,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.id))
        .returning({
          id: users.id,
          tags: users.tags,
        });

      if (!updatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return updatedUser;
    }),

  // Admin: Add/Update customer notes
  adminUpdateNotes: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        notes: z.string(),
        append: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let finalNotes = input.notes;

      if (input.append) {
        const customer = await ctx.db.query.users.findFirst({
          where: eq(users.id, input.id),
          columns: { adminNotes: true },
        });

        const existingNotes = customer?.adminNotes || "";
        const timestamp = new Date().toISOString();
        finalNotes = existingNotes
          ? `${existingNotes}\n[${timestamp}] ${input.notes}`
          : `[${timestamp}] ${input.notes}`;
      }

      const [updatedUser] = await ctx.db
        .update(users)
        .set({
          adminNotes: finalNotes,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.id))
        .returning({
          id: users.id,
          adminNotes: users.adminNotes,
        });

      if (!updatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return updatedUser;
    }),

  // Admin: Bulk update tags
  adminBulkUpdateTags: adminProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()),
        tags: z.array(z.string()),
        mode: z.enum(["replace", "add", "remove"]).default("replace"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.mode === "replace") {
        await ctx.db
          .update(users)
          .set({ tags: input.tags, updatedAt: new Date() })
          .where(inArray(users.id, input.ids));
      } else {
        // For add/remove, we need to update each user individually
        for (const userId of input.ids) {
          const user = await ctx.db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { tags: true },
          });

          let newTags = user?.tags || [];

          if (input.mode === "add") {
            newTags = [...new Set([...newTags, ...input.tags])];
          } else if (input.mode === "remove") {
            newTags = newTags.filter((t) => !input.tags.includes(t));
          }

          await ctx.db
            .update(users)
            .set({ tags: newTags, updatedAt: new Date() })
            .where(eq(users.id, userId));
        }
      }

      return { success: true, count: input.ids.length };
    }),

  // Admin: Export customers
  adminExport: adminProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()).optional(),
        role: z.enum(["customer", "admin"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input.ids && input.ids.length > 0) {
        conditions.push(inArray(users.id, input.ids));
      }
      if (input.role) {
        conditions.push(eq(users.role, input.role));
      }

      const customerList = await ctx.db.query.users.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        columns: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          tags: true,
          createdAt: true,
        },
      });

      // Get order stats for each customer
      const customerIds = customerList.map((c) => c.id);
      const orderStats = await ctx.db
        .select({
          userId: orders.userId,
          totalOrders: count(),
          totalSpent: sql<string>`COALESCE(SUM(CAST(${orders.total} AS DECIMAL)), 0)`,
        })
        .from(orders)
        .where(
          and(
            inArray(orders.userId, customerIds),
            eq(orders.paymentStatus, "paid")
          )
        )
        .groupBy(orders.userId);

      const statsMap = new Map(
        orderStats.map((s) => [
          s.userId,
          { totalOrders: s.totalOrders, totalSpent: parseFloat(s.totalSpent) },
        ])
      );

      return customerList.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        role: c.role,
        tags: c.tags?.join(", ") || "",
        totalOrders: statsMap.get(c.id)?.totalOrders || 0,
        totalSpent: statsMap.get(c.id)?.totalSpent || 0,
        createdAt: c.createdAt,
      }));
    }),
});
