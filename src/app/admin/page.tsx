"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { RecentOrdersTable } from "@/components/admin/recent-orders-table";
import { TopProducts } from "@/components/admin/top-products";
import { CategorySalesChart } from "@/components/admin/category-sales-chart";
import {
  IndianRupee,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { subDays, subMonths } from "date-fns";

type DateRangeOption = "7d" | "30d" | "90d" | "12m";

const dateRangeOptions: { value: DateRangeOption; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "12m", label: "Last 12 months" },
];

export default function AdminDashboard() {
  const [dateRange, setDateRange] = useState<DateRangeOption>("30d");

  const { data: stats, isLoading } = trpc.dashboard.getStats.useQuery();

  // Calculate date range for child components
  const dateRangeValues = useMemo(() => {
    const endDate = new Date();
    let startDate: Date;

    switch (dateRange) {
      case "7d":
        startDate = subDays(endDate, 7);
        break;
      case "30d":
        startDate = subDays(endDate, 30);
        break;
      case "90d":
        startDate = subDays(endDate, 90);
        break;
      case "12m":
        startDate = subMonths(endDate, 12);
        break;
      default:
        startDate = subDays(endDate, 30);
    }

    return { startDate, endDate };
  }, [dateRange]);

  const selectedRangeLabel = dateRangeOptions.find(
    (opt) => opt.value === dateRange
  )?.label;

  // Format numbers with K/M suffix
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Calendar className="mr-2 h-4 w-4" />
                <span className="text-sm">{selectedRangeLabel}</span>
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {dateRangeOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setDateRange(option.value)}
                  className={cn(
                    dateRange === option.value && "bg-accent"
                  )}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Hero Card */}
        <Card className="border md:col-span-2 lg:col-span-1 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-3xl font-bold">
                ₹{isLoading ? "..." : (stats?.totalRevenue || 0).toLocaleString()}
              </p>
              <div className="flex items-center gap-1 text-sm">
                <span className={cn(
                  "flex items-center gap-0.5 font-medium",
                  (stats?.revenueChange || 0) >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}>
                  {(stats?.revenueChange || 0) >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(stats?.revenueChange || 0).toFixed(1)}%
                </span>
                <span className="text-muted-foreground">from last month</span>
              </div>
            </div>
            <div className="mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/orders">
                  View Sales
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Orders Card */}
        <Card className="border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold mt-1">
                  {isLoading ? "..." : formatNumber(stats?.totalOrders || 0)}
                </p>
              </div>
              <div className={cn(
                "text-xs font-medium px-2 py-1 rounded-full",
                (stats?.ordersChange || 0) >= 0
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
              )}>
                {(stats?.ordersChange || 0) >= 0 ? "+" : ""}{(stats?.ordersChange || 0).toFixed(1)}%
              </div>
            </div>
            <Link
              href="/admin/orders"
              className="flex items-center gap-1 mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              View more <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Customers Card */}
        <Card className="border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Customers</p>
                <p className="text-2xl font-bold mt-1">
                  {isLoading ? "..." : formatNumber(stats?.totalCustomers || 0)}
                </p>
              </div>
              <div className={cn(
                "text-xs font-medium px-2 py-1 rounded-full",
                (stats?.customersChange || 0) >= 0
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
              )}>
                {(stats?.customersChange || 0) >= 0 ? "+" : ""}{(stats?.customersChange || 0).toFixed(1)}%
              </div>
            </div>
            <Link
              href="/admin/customers"
              className="flex items-center gap-1 mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              View more <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Products Card */}
        <Card className="border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Products</p>
                <p className="text-2xl font-bold mt-1">
                  {isLoading ? "..." : stats?.totalProducts || 0}
                </p>
              </div>
              <div className={cn(
                "text-xs font-medium px-2 py-1 rounded-full",
                (stats?.productsChange || 0) >= 0
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
              )}>
                {(stats?.productsChange || 0) >= 0 ? "+" : ""}{(stats?.productsChange || 0).toFixed(1)}%
              </div>
            </div>
            <Link
              href="/admin/products"
              className="flex items-center gap-1 mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              View more <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart - Full Width */}
      <RevenueChart />

      {/* Category Sales & Top Products */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CategorySalesChart
          startDate={dateRangeValues.startDate}
          endDate={dateRangeValues.endDate}
        />
        <TopProducts
          startDate={dateRangeValues.startDate}
          endDate={dateRangeValues.endDate}
        />
      </div>

      {/* Recent Orders & Low Stock */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentOrdersTable />
        <LowStockAlert />
      </div>

      {/* Quick Stats Footer */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickStat
          title="Today's Orders"
          value={stats?.todayOrders || 0}
          icon={ShoppingCart}
          loading={isLoading}
        />
        <QuickStat
          title="Pending Orders"
          value={stats?.pendingOrders || 0}
          icon={AlertTriangle}
          iconColor="text-amber-500"
          loading={isLoading}
        />
        <QuickStat
          title="Avg Order Value"
          value={stats?.avgOrderValue || 0}
          prefix="₹"
          icon={IndianRupee}
          loading={isLoading}
        />
        <QuickStat
          title="Low Stock Items"
          value={stats?.lowStockCount || 0}
          icon={Package}
          iconColor="text-red-500"
          loading={isLoading}
        />
      </div>
    </div>
  );
}

function QuickStat({
  title,
  value,
  icon: Icon,
  prefix = "",
  iconColor = "text-muted-foreground",
  loading = false
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  prefix?: string;
  iconColor?: string;
  loading?: boolean;
}) {
  return (
    <Card className="border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-semibold mt-1">
              {loading ? "..." : `${prefix}${value.toLocaleString()}`}
            </p>
          </div>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </CardContent>
    </Card>
  );
}

function LowStockAlert() {
  const { data, isLoading } = trpc.inventory.getOverview.useQuery({
    page: 1,
    limit: 5,
    filter: "low_stock",
  });

  const lowStockItems = data?.items || [];

  return (
    <Card className="border">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-base font-semibold">Low Stock Alerts</CardTitle>
        </div>
        <Button variant="ghost" size="sm" className="text-xs" asChild>
          <Link href="/admin/products">
            View All
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : lowStockItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No low stock alerts</p>
            <p className="text-xs text-muted-foreground mt-1">
              All products are well stocked
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.sku || "No SKU"}
                  </p>
                </div>
                <div className="shrink-0">
                  <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400">
                    {item.totalStock} left
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
