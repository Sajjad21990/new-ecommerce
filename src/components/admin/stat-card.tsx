import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  iconColor?: "blue" | "green" | "purple" | "orange" | "yellow" | "red" | "pink" | "indigo";
  trend?: {
    value: string;
    isPositive: boolean;
  };
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
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = "blue",
  trend,
}: StatCardProps) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
      <CardContent className="p-4 sm:p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
              <h3 className="text-2xl sm:text-2xl md:text-3xl font-bold text-foreground">{value}</h3>
              {trend && (
                <span
                  className={cn(
                    "flex items-center text-xs sm:text-sm font-medium whitespace-nowrap",
                    trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  )}
                >
                  {trend.isPositive ? "↑" : "↓"} {trend.value}
                </span>
              )}
            </div>
            {description && (
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground line-clamp-1">{description}</p>
            )}
          </div>
          <div
            className={cn(
              "flex h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 items-center justify-center rounded-xl shrink-0",
              iconColorClasses[iconColor]
            )}
          >
            <Icon className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
