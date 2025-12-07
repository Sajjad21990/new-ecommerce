import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import {
  products,
  orders,
  users,
  productVariants,
} from "@/server/db/schema";
import { count, eq, sql, and, gte, lte } from "drizzle-orm";

export const dashboardRouter = createTRPCRouter({
  getStats: adminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Total counts
    const [
      totalProductsResult,
      totalOrdersResult,
      totalCustomersResult,
      todayOrdersResult,
      pendingOrdersResult,
      lowStockResult,
    ] = await Promise.all([
      // Total products
      ctx.db.select({ count: count() }).from(products),
      // Total orders
      ctx.db.select({ count: count() }).from(orders),
      // Total customers (users with customer role)
      ctx.db.select({ count: count() }).from(users).where(eq(users.role, "customer")),
      // Today's orders
      ctx.db
        .select({ count: count() })
        .from(orders)
        .where(gte(orders.createdAt, startOfDay)),
      // Pending orders
      ctx.db
        .select({ count: count() })
        .from(orders)
        .where(eq(orders.status, "pending")),
      // Low stock items (variants with stock <= 5)
      ctx.db
        .select({ count: count() })
        .from(productVariants)
        .where(lte(productVariants.stock, 5)),
    ]);

    // Total revenue
    const totalRevenueResult = await ctx.db
      .select({
        total: sql<string>`COALESCE(SUM(${orders.total}::numeric), 0)`,
      })
      .from(orders)
      .where(eq(orders.status, "delivered"));

    // This month's revenue
    const thisMonthRevenueResult = await ctx.db
      .select({
        total: sql<string>`COALESCE(SUM(${orders.total}::numeric), 0)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.status, "delivered"),
          gte(orders.createdAt, startOfMonth)
        )
      );

    // Last month's revenue
    const lastMonthRevenueResult = await ctx.db
      .select({
        total: sql<string>`COALESCE(SUM(${orders.total}::numeric), 0)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.status, "delivered"),
          gte(orders.createdAt, startOfLastMonth),
          lte(orders.createdAt, endOfLastMonth)
        )
      );

    // This month's orders
    const thisMonthOrdersResult = await ctx.db
      .select({ count: count() })
      .from(orders)
      .where(gte(orders.createdAt, startOfMonth));

    // Last month's orders
    const lastMonthOrdersResult = await ctx.db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, startOfLastMonth),
          lte(orders.createdAt, endOfLastMonth)
        )
      );

    // Calculate changes
    const thisMonthRevenue = parseFloat(thisMonthRevenueResult[0]?.total || "0");
    const lastMonthRevenue = parseFloat(lastMonthRevenueResult[0]?.total || "0");
    const revenueChange =
      lastMonthRevenue > 0
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

    const thisMonthOrders = thisMonthOrdersResult[0]?.count || 0;
    const lastMonthOrders = lastMonthOrdersResult[0]?.count || 0;
    const ordersChange =
      lastMonthOrders > 0
        ? ((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100
        : 0;

    // Average order value
    const avgOrderValue =
      totalOrdersResult[0]?.count && totalOrdersResult[0].count > 0
        ? parseFloat(totalRevenueResult[0]?.total || "0") /
          totalOrdersResult[0].count
        : 0;

    return {
      totalProducts: totalProductsResult[0]?.count || 0,
      totalOrders: totalOrdersResult[0]?.count || 0,
      totalCustomers: totalCustomersResult[0]?.count || 0,
      totalRevenue: parseFloat(totalRevenueResult[0]?.total || "0"),
      todayOrders: todayOrdersResult[0]?.count || 0,
      pendingOrders: pendingOrdersResult[0]?.count || 0,
      lowStockCount: lowStockResult[0]?.count || 0,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      revenueChange: Math.round(revenueChange * 10) / 10,
      ordersChange: Math.round(ordersChange * 10) / 10,
      customersChange: 5.1, // Placeholder
      productsChange: 3, // Placeholder
    };
  }),
});
