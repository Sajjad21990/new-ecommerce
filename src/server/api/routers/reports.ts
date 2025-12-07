import { z } from "zod";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import {
  orders,
  orderItems,
  products,
  users,
  reviews,
  productVariants,
} from "@/server/db/schema";

export const reportsRouter = createTRPCRouter({
  // Sales summary report
  salesSummary: adminProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;

      // Total sales
      const salesData = await ctx.db
        .select({
          totalOrders: count(),
          totalRevenue: sql<number>`COALESCE(SUM(CAST(${orders.total} AS DECIMAL)), 0)`,
          avgOrderValue: sql<number>`COALESCE(AVG(CAST(${orders.total} AS DECIMAL)), 0)`,
        })
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, startDate),
            lte(orders.createdAt, endDate),
            eq(orders.paymentStatus, "paid")
          )
        );

      // Previous period comparison
      const periodLength = endDate.getTime() - startDate.getTime();
      const prevStartDate = new Date(startDate.getTime() - periodLength);
      const prevEndDate = new Date(startDate.getTime() - 1);

      const prevSalesData = await ctx.db
        .select({
          totalOrders: count(),
          totalRevenue: sql<number>`COALESCE(SUM(CAST(${orders.total} AS DECIMAL)), 0)`,
        })
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, prevStartDate),
            lte(orders.createdAt, prevEndDate),
            eq(orders.paymentStatus, "paid")
          )
        );

      const current = salesData[0];
      const previous = prevSalesData[0];

      return {
        totalOrders: current?.totalOrders || 0,
        totalRevenue: Number(current?.totalRevenue || 0),
        avgOrderValue: Number(current?.avgOrderValue || 0),
        comparison: {
          ordersChange: previous?.totalOrders
            ? (((current?.totalOrders || 0) - previous.totalOrders) / previous.totalOrders) * 100
            : 0,
          revenueChange: previous?.totalRevenue
            ? ((Number(current?.totalRevenue || 0) - Number(previous.totalRevenue)) / Number(previous.totalRevenue)) * 100
            : 0,
        },
      };
    }),

  // Sales by date (for charts)
  salesByDate: adminProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        groupBy: z.enum(["day", "week", "month"]).default("day"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, groupBy } = input;

      let dateFormat: string;
      switch (groupBy) {
        case "week":
          dateFormat = "YYYY-WW";
          break;
        case "month":
          dateFormat = "YYYY-MM";
          break;
        default:
          dateFormat = "YYYY-MM-DD";
      }

      const data = await ctx.db
        .select({
          date: sql<string>`TO_CHAR(${orders.createdAt}, '${sql.raw(dateFormat)}')`,
          orders: count(),
          revenue: sql<number>`COALESCE(SUM(CAST(${orders.total} AS DECIMAL)), 0)`,
        })
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, startDate),
            lte(orders.createdAt, endDate),
            eq(orders.paymentStatus, "paid")
          )
        )
        .groupBy(sql`TO_CHAR(${orders.createdAt}, '${sql.raw(dateFormat)}')`)
        .orderBy(sql`TO_CHAR(${orders.createdAt}, '${sql.raw(dateFormat)}')`);

      return data.map((d) => ({
        date: d.date,
        orders: d.orders,
        revenue: Number(d.revenue),
      }));
    }),

  // Top selling products
  topProducts: adminProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, limit } = input;

      const conditions = [];
      if (startDate) {
        conditions.push(gte(orders.createdAt, startDate));
      }
      if (endDate) {
        conditions.push(lte(orders.createdAt, endDate));
      }
      conditions.push(eq(orders.paymentStatus, "paid"));

      const data = await ctx.db
        .select({
          productId: orderItems.productId,
          productName: orderItems.name,
          totalQuantity: sql<number>`SUM(${orderItems.quantity})`,
          totalRevenue: sql<number>`SUM(CAST(${orderItems.total} AS DECIMAL))`,
          orderCount: sql<number>`COUNT(DISTINCT ${orderItems.orderId})`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(orderItems.productId, orderItems.name)
        .orderBy(desc(sql`SUM(${orderItems.quantity})`))
        .limit(limit);

      return data.map((d) => ({
        productId: d.productId,
        productName: d.productName,
        totalQuantity: Number(d.totalQuantity),
        totalRevenue: Number(d.totalRevenue),
        orderCount: Number(d.orderCount),
      }));
    }),

  // Sales by category
  salesByCategory: adminProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;

      const conditions = [];
      if (startDate) {
        conditions.push(gte(orders.createdAt, startDate));
      }
      if (endDate) {
        conditions.push(lte(orders.createdAt, endDate));
      }
      conditions.push(eq(orders.paymentStatus, "paid"));

      const data = await ctx.db
        .select({
          categoryId: products.categoryId,
          totalQuantity: sql<number>`SUM(${orderItems.quantity})`,
          totalRevenue: sql<number>`SUM(CAST(${orderItems.total} AS DECIMAL))`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .leftJoin(products, eq(orderItems.productId, products.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(products.categoryId);

      // Get category names
      const categoryIds = data.map((d) => d.categoryId).filter(Boolean) as string[];
      const categoriesData = await ctx.db.query.categories.findMany({
        where: sql`${products.categoryId} IN (${categoryIds.join(", ")})`,
        columns: { id: true, name: true },
      });

      const categoryMap = new Map(categoriesData.map((c) => [c.id, c.name]));

      return data.map((d) => ({
        categoryId: d.categoryId,
        categoryName: d.categoryId ? categoryMap.get(d.categoryId) || "Unknown" : "Uncategorized",
        totalQuantity: Number(d.totalQuantity),
        totalRevenue: Number(d.totalRevenue),
      }));
    }),

  // Customer report
  customerReport: adminProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;

      const conditions = [];
      if (startDate) {
        conditions.push(gte(users.createdAt, startDate));
      }
      if (endDate) {
        conditions.push(lte(users.createdAt, endDate));
      }
      conditions.push(eq(users.role, "customer"));

      // New customers
      const newCustomers = await ctx.db
        .select({ count: count() })
        .from(users)
        .where(conditions.length > 0 ? and(...conditions) : eq(users.role, "customer"));

      // Repeat customers (customers with more than 1 order)
      const orderConditions = [];
      if (startDate) {
        orderConditions.push(gte(orders.createdAt, startDate));
      }
      if (endDate) {
        orderConditions.push(lte(orders.createdAt, endDate));
      }
      orderConditions.push(eq(orders.paymentStatus, "paid"));

      const repeatCustomers = await ctx.db
        .select({
          userId: orders.userId,
          orderCount: count(),
        })
        .from(orders)
        .where(orderConditions.length > 0 ? and(...orderConditions) : eq(orders.paymentStatus, "paid"))
        .groupBy(orders.userId)
        .having(sql`count(*) > 1`);

      // Top customers by spending
      const topCustomers = await ctx.db
        .select({
          userId: orders.userId,
          totalOrders: count(),
          totalSpent: sql<number>`SUM(CAST(${orders.total} AS DECIMAL))`,
        })
        .from(orders)
        .where(orderConditions.length > 0 ? and(...orderConditions) : eq(orders.paymentStatus, "paid"))
        .groupBy(orders.userId)
        .orderBy(desc(sql`SUM(CAST(${orders.total} AS DECIMAL))`))
        .limit(10);

      // Get user details
      const userIds = topCustomers.map((c) => c.userId).filter((id): id is string => id !== null);
      const usersData = await ctx.db.query.users.findMany({
        where: userIds.length > 0 ? sql`${users.id}::text IN (${userIds.map((id) => `'${id}'`).join(", ")})` : undefined,
        columns: { id: true, name: true, email: true },
      });

      const userMap = new Map(usersData.map((u) => [u.id, u]));

      return {
        newCustomers: newCustomers[0]?.count || 0,
        repeatCustomers: repeatCustomers.length,
        topCustomers: topCustomers.map((c) => {
          const user = c.userId ? userMap.get(c.userId) : undefined;
          return {
            userId: c.userId,
            name: user?.name ?? "Unknown",
            email: user?.email ?? "",
            totalOrders: c.totalOrders,
            totalSpent: Number(c.totalSpent),
          };
        }),
      };
    }),

  // Inventory report
  inventoryReport: adminProcedure.query(async ({ ctx }) => {
    // Low stock products
    const lowStock = await ctx.db.query.productVariants.findMany({
      where: and(
        eq(productVariants.isActive, true),
        lte(productVariants.stock, 10)
      ),
      orderBy: productVariants.stock,
      with: {
        product: {
          columns: { id: true, name: true, slug: true },
        },
      },
    });

    // Out of stock
    const outOfStock = await ctx.db.query.productVariants.findMany({
      where: and(
        eq(productVariants.isActive, true),
        eq(productVariants.stock, 0)
      ),
      with: {
        product: {
          columns: { id: true, name: true, slug: true },
        },
      },
    });

    // Total inventory value
    const inventoryValue = await ctx.db
      .select({
        totalValue: sql<number>`SUM(${productVariants.stock} * CAST(COALESCE(${productVariants.price}, (SELECT base_price FROM products WHERE id = ${productVariants.productId})) AS DECIMAL))`,
        totalItems: sql<number>`SUM(${productVariants.stock})`,
      })
      .from(productVariants)
      .where(eq(productVariants.isActive, true));

    return {
      lowStock: lowStock.map((v) => ({
        variantId: v.id,
        productId: v.productId,
        productName: v.product?.name || "Unknown",
        size: v.size,
        color: v.color,
        stock: v.stock,
        sku: v.sku,
      })),
      outOfStockCount: outOfStock.length,
      totalInventoryValue: Number(inventoryValue[0]?.totalValue || 0),
      totalItems: Number(inventoryValue[0]?.totalItems || 0),
    };
  }),

  // Reviews summary
  reviewsSummary: adminProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;

      const conditions = [];
      if (startDate) {
        conditions.push(gte(reviews.createdAt, startDate));
      }
      if (endDate) {
        conditions.push(lte(reviews.createdAt, endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Total reviews and average rating
      const summary = await ctx.db
        .select({
          totalReviews: count(),
          avgRating: sql<number>`AVG(${reviews.rating})`,
          pendingReviews: sql<number>`COUNT(*) FILTER (WHERE ${reviews.isApproved} = false)`,
        })
        .from(reviews)
        .where(whereClause);

      // Rating distribution
      const distribution = await ctx.db
        .select({
          rating: reviews.rating,
          count: count(),
        })
        .from(reviews)
        .where(whereClause)
        .groupBy(reviews.rating)
        .orderBy(desc(reviews.rating));

      return {
        totalReviews: summary[0]?.totalReviews || 0,
        avgRating: Number(summary[0]?.avgRating || 0).toFixed(1),
        pendingReviews: Number(summary[0]?.pendingReviews || 0),
        distribution: distribution.map((d) => ({
          rating: d.rating,
          count: d.count,
        })),
      };
    }),

  // Dashboard overview (combined stats)
  dashboardOverview: adminProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    // Today's stats
    const todayStats = await ctx.db
      .select({
        orders: count(),
        revenue: sql<number>`COALESCE(SUM(CAST(${orders.total} AS DECIMAL)), 0)`,
      })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, today),
          eq(orders.paymentStatus, "paid")
        )
      );

    // This month stats
    const monthStats = await ctx.db
      .select({
        orders: count(),
        revenue: sql<number>`COALESCE(SUM(CAST(${orders.total} AS DECIMAL)), 0)`,
      })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, thisMonth),
          eq(orders.paymentStatus, "paid")
        )
      );

    // Last month stats (for comparison)
    const lastMonthStats = await ctx.db
      .select({
        orders: count(),
        revenue: sql<number>`COALESCE(SUM(CAST(${orders.total} AS DECIMAL)), 0)`,
      })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, lastMonth),
          lte(orders.createdAt, lastMonthEnd),
          eq(orders.paymentStatus, "paid")
        )
      );

    // Pending orders
    const pendingOrders = await ctx.db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.status, "pending"));

    // New customers this week
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const newCustomers = await ctx.db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          eq(users.role, "customer"),
          gte(users.createdAt, weekAgo)
        )
      );

    // Pending reviews
    const pendingReviews = await ctx.db
      .select({ count: count() })
      .from(reviews)
      .where(eq(reviews.isApproved, false));

    return {
      today: {
        orders: todayStats[0]?.orders || 0,
        revenue: Number(todayStats[0]?.revenue || 0),
      },
      thisMonth: {
        orders: monthStats[0]?.orders || 0,
        revenue: Number(monthStats[0]?.revenue || 0),
      },
      lastMonth: {
        orders: lastMonthStats[0]?.orders || 0,
        revenue: Number(lastMonthStats[0]?.revenue || 0),
      },
      pendingOrders: pendingOrders[0]?.count || 0,
      newCustomersThisWeek: newCustomers[0]?.count || 0,
      pendingReviews: pendingReviews[0]?.count || 0,
    };
  }),
});
