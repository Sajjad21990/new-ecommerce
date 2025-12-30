"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  ShoppingCart,
  Users,
  FileText,
  Settings,
  Store,
  ImageIcon,
  Warehouse,
  ChevronRight,
  Plus,
  ListOrdered,
  RotateCcw,
  CreditCard,
  Cog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  submenu?: { name: string; href: string; icon?: React.ElementType }[];
}

const navigation: NavItem[] = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "Products",
    href: "/admin/products",
    icon: Package,
    submenu: [
      { name: "All Products", href: "/admin/products", icon: ListOrdered },
      { name: "Add Product", href: "/admin/products/new", icon: Plus },
      { name: "Inventory", href: "/admin/inventory", icon: Warehouse },
      { name: "Categories", href: "/admin/categories", icon: FolderTree },
      { name: "Brands", href: "/admin/brands", icon: Tag },
    ],
  },
  {
    name: "Media",
    href: "/admin/media",
    icon: ImageIcon,
  },
  {
    name: "Orders",
    href: "/admin/orders",
    icon: ShoppingCart,
    submenu: [
      { name: "All Orders", href: "/admin/orders", icon: ListOrdered },
      { name: "Returns", href: "/admin/orders/returns", icon: RotateCcw },
    ],
  },
  {
    name: "Customers",
    href: "/admin/customers",
    icon: Users,
  },
  {
    name: "Content",
    href: "/admin/content",
    icon: FileText,
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
    submenu: [
      { name: "General", href: "/admin/settings", icon: Cog },
      { name: "Payments", href: "/admin/settings/payments", icon: CreditCard },
    ],
  },
];

interface AdminSidebarProps {
  isCollapsed: boolean;
}

export function AdminSidebar({ isCollapsed }: AdminSidebarProps) {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  // Auto-expand menu based on current path
  useEffect(() => {
    const activeMenus = navigation
      .filter((item) => {
        if (!item.submenu) return false;
        return item.submenu.some(
          (sub) => pathname === sub.href || pathname.startsWith(sub.href + "/")
        );
      })
      .map((item) => item.name);
    setOpenMenus(activeMenus);
  }, [pathname]);

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]
    );
  };

  const isActive = (href: string, submenu?: NavItem["submenu"]) => {
    if (submenu) {
      return submenu.some(
        (sub) => pathname === sub.href || pathname.startsWith(sub.href + "/")
      );
    }
    return pathname === href || (href !== "/admin" && pathname.startsWith(href + "/"));
  };

  const isSubActive = (href: string) => {
    // Exact match only - don't highlight parent routes when on child routes
    return pathname === href;
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-14 z-30 flex h-[calc(100vh-3.5rem)] flex-col border-r bg-background transition-all duration-300",
        isCollapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className={cn("space-y-1", isCollapsed ? "px-2" : "px-3")}>
          {!isCollapsed && (
            <p className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Menu
            </p>
          )}

          <TooltipProvider delayDuration={0}>
            {navigation.map((item) => {
              const active = isActive(item.href, item.submenu);
              const hasSubmenu = item.submenu && item.submenu.length > 0;
              const isOpen = openMenus.includes(item.name);

              if (isCollapsed) {
                // Collapsed view - show tooltip
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="flex items-center gap-4">
                      {item.name}
                      {hasSubmenu && (
                        <span className="ml-auto text-muted-foreground">
                          {item.submenu!.length} items
                        </span>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              // Expanded view
              if (hasSubmenu) {
                return (
                  <Collapsible
                    key={item.name}
                    open={isOpen}
                    onOpenChange={() => toggleMenu(item.name)}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 text-left">{item.name}</span>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform duration-200",
                            isOpen && "rotate-90"
                          )}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 pt-1">
                      {item.submenu!.map((subItem) => {
                        const subActive = isSubActive(subItem.href);
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={cn(
                              "flex items-center gap-3 rounded-lg py-1.5 pl-9 pr-3 text-sm transition-colors",
                              subActive
                                ? "bg-primary text-primary-foreground font-medium"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            {subItem.icon && (
                              <subItem.icon className="h-3.5 w-3.5 shrink-0" />
                            )}
                            <span>{subItem.name}</span>
                          </Link>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </TooltipProvider>
        </nav>
      </ScrollArea>

      {/* Footer - View Store */}
      <div className={cn("border-t border-border/50 p-2", isCollapsed && "px-2")}>
        {isCollapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  asChild
                >
                  <Link href="/">
                    <Store className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">View Store</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button variant="outline" className="w-full justify-start" asChild>
            <Link href="/">
              <Store className="mr-2 h-4 w-4" />
              View Store
            </Link>
          </Button>
        )}
      </div>
    </aside>
  );
}
