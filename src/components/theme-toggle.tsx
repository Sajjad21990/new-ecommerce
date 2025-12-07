"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant?: "icon" | "full";
  className?: string;
}

export function ThemeToggle({ variant = "icon", className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={cn("h-9 w-9", className)}>
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  if (variant === "full") {
    return (
      <div className={cn("flex items-center gap-1 rounded-lg border bg-muted/50 p-1", className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme("light")}
          className={cn(
            "h-7 px-2.5 text-xs",
            theme === "light" && "bg-background shadow-sm"
          )}
        >
          <Sun className="h-3.5 w-3.5 mr-1.5" />
          Light
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme("dark")}
          className={cn(
            "h-7 px-2.5 text-xs",
            theme === "dark" && "bg-background shadow-sm"
          )}
        >
          <Moon className="h-3.5 w-3.5 mr-1.5" />
          Dark
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme("system")}
          className={cn(
            "h-7 px-2.5 text-xs",
            theme === "system" && "bg-background shadow-sm"
          )}
        >
          <Monitor className="h-3.5 w-3.5 mr-1.5" />
          System
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("h-9 w-9", className)}>
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2">
          <Sun className="h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2">
          <Moon className="h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2">
          <Monitor className="h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
