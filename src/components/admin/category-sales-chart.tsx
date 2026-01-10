"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { subDays } from "date-fns";
import { PieChartIcon } from "lucide-react";

interface CategorySalesChartProps {
  className?: string;
  startDate?: Date;
  endDate?: Date;
}

// Color palette for pie chart segments
const COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
];

export function CategorySalesChart({
  className,
  startDate,
  endDate,
}: CategorySalesChartProps) {
  // Default to last 30 days if no dates provided
  const queryDates = useMemo(() => {
    return {
      startDate: startDate || subDays(new Date(), 30),
      endDate: endDate || new Date(),
    };
  }, [startDate, endDate]);

  const { data: salesData, isLoading } = trpc.reports.salesByCategory.useQuery({
    startDate: queryDates.startDate,
    endDate: queryDates.endDate,
  });

  // Format data for pie chart
  const chartData = useMemo(() => {
    if (!salesData || salesData.length === 0) return [];

    // Calculate total revenue for percentages
    const totalRevenue = salesData.reduce((sum, item) => sum + item.totalRevenue, 0);

    return salesData
      .filter((item) => item.totalRevenue > 0)
      .map((item, index) => ({
        name: item.categoryName,
        value: item.totalRevenue,
        percentage: totalRevenue > 0 ? ((item.totalRevenue / totalRevenue) * 100).toFixed(1) : "0",
        color: COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Limit to top 8 categories
  }, [salesData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{data.name}</p>
          <div className="mt-1 space-y-0.5">
            <p className="text-sm">
              <span className="text-muted-foreground">Revenue: </span>
              <span className="font-medium">₹{data.value.toLocaleString()}</span>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Share: </span>
              <span className="font-medium">{data.percentage}%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderCustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4">
        {payload?.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-muted-foreground truncate max-w-[80px]">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className={cn("border", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Sales by Category</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[280px] flex items-center justify-center">
            <Skeleton className="h-[200px] w-[200px] rounded-full" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center">
            <div className="text-center">
              <PieChartIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No category sales data</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sales by category will appear here
              </p>
            </div>
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={renderCustomLegend} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
