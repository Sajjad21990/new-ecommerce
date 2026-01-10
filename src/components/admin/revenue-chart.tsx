"use client";

import { useState, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { format, subDays, subMonths } from "date-fns";

type Period = "7d" | "30d" | "90d" | "12m";

interface RevenueChartProps {
  className?: string;
}

export function RevenueChart({ className }: RevenueChartProps) {
  const [period, setPeriod] = useState<Period>("30d");

  // Calculate date range based on selected period
  const dateRange = useMemo(() => {
    const endDate = new Date();
    let startDate: Date;
    let groupBy: "day" | "week" | "month" = "day";

    switch (period) {
      case "7d":
        startDate = subDays(endDate, 7);
        groupBy = "day";
        break;
      case "30d":
        startDate = subDays(endDate, 30);
        groupBy = "day";
        break;
      case "90d":
        startDate = subDays(endDate, 90);
        groupBy = "week";
        break;
      case "12m":
        startDate = subMonths(endDate, 12);
        groupBy = "month";
        break;
      default:
        startDate = subDays(endDate, 30);
    }

    return { startDate, endDate, groupBy };
  }, [period]);

  const { data: salesData, isLoading } = trpc.reports.salesByDate.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    groupBy: dateRange.groupBy,
  });

  // Format chart data with readable dates
  const chartData = useMemo(() => {
    if (!salesData || salesData.length === 0) return [];

    return salesData.map((item) => {
      let formattedDate = item.date;

      // Format date based on groupBy
      if (dateRange.groupBy === "day") {
        // Parse YYYY-MM-DD format
        const [year, month, day] = item.date.split("-");
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        formattedDate = format(date, "MMM d");
      } else if (dateRange.groupBy === "week") {
        // Week format: YYYY-WW
        formattedDate = `W${item.date.split("-")[1]}`;
      } else if (dateRange.groupBy === "month") {
        // Month format: YYYY-MM
        const [year, month] = item.date.split("-");
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        formattedDate = format(date, "MMM yyyy");
      }

      return {
        date: formattedDate,
        revenue: item.revenue,
        orders: item.orders,
      };
    });
  }, [salesData, dateRange.groupBy]);

  const periods: { value: Period; label: string }[] = [
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
    { value: "90d", label: "90 days" },
    { value: "12m", label: "12 months" },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Revenue: </span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                ₹{payload[0]?.value?.toLocaleString()}
              </span>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Orders: </span>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {payload[1]?.value}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={cn("border", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Revenue Overview</CardTitle>
        <div className="flex gap-1">
          {periods.map((p) => (
            <Button
              key={p.value}
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2.5 text-xs",
                period === p.value
                  ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  : "text-muted-foreground"
              )}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex flex-col gap-4">
            <Skeleton className="h-full w-full" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">No sales data for this period</p>
              <p className="text-xs text-muted-foreground mt-1">Orders will appear here once you have sales</p>
            </div>
          </div>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border/50"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `₹${value}`}
                  className="text-muted-foreground"
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOrders)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">Orders</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
