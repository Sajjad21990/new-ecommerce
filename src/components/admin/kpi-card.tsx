"use client";

import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    period: string;
  };
  icon: LucideIcon;
  iconColor?: "blue" | "green" | "purple" | "orange" | "yellow" | "red" | "pink" | "indigo" | "cyan";
  prefix?: string;
  suffix?: string;
  loading?: boolean;
}

const iconColorClasses = {
  blue: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
  green: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
  purple: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
  orange: "bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400",
  yellow: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
  red: "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400",
  pink: "bg-pink-500/10 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400",
  indigo: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
  cyan: "bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400",
};

export function KpiCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = "blue",
  prefix = "",
  suffix = "",
  loading = false,
}: KpiCardProps) {
  const isPositive = change && change.value >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card className="border hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">
              {title}
            </p>
            <div className="mt-2 flex items-baseline gap-2 flex-wrap">
              {loading ? (
                <div className="h-8 w-24 animate-pulse rounded bg-muted" />
              ) : (
                <h3 className="text-2xl font-bold text-foreground">
                  {prefix}
                  {typeof value === "number" ? value.toLocaleString() : value}
                  {suffix}
                </h3>
              )}
            </div>
            {change && (
              <div className="mt-2 flex items-center gap-1.5">
                <div
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-medium rounded-full px-1.5 py-0.5",
                    isPositive
                      ? "text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/20"
                      : "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-500/20"
                  )}
                >
                  <TrendIcon className="h-3 w-3" />
                  <span>{Math.abs(change.value)}%</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {change.period}
                </span>
              </div>
            )}
          </div>
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              iconColorClasses[iconColor]
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
