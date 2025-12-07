"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  ShoppingCart,
  Users,
  Percent,
  Star,
  FileText,
  Settings,
  ImageIcon,
  Warehouse,
  Plus,
  Search,
  ArrowRight,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

interface CommandSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const pages = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    keywords: ["home", "overview", "analytics"],
  },
  {
    name: "All Products",
    href: "/admin/products",
    icon: Package,
    keywords: ["items", "inventory", "catalog"],
  },
  {
    name: "Add New Product",
    href: "/admin/products/new",
    icon: Plus,
    keywords: ["create", "new item"],
  },
  {
    name: "Categories",
    href: "/admin/categories",
    icon: FolderTree,
    keywords: ["organize", "groups"],
  },
  {
    name: "Brands",
    href: "/admin/brands",
    icon: Tag,
    keywords: ["manufacturers", "labels"],
  },
  {
    name: "Media Library",
    href: "/admin/media",
    icon: ImageIcon,
    keywords: ["images", "files", "uploads"],
  },
  {
    name: "Inventory",
    href: "/admin/inventory",
    icon: Warehouse,
    keywords: ["stock", "quantity"],
  },
  {
    name: "All Orders",
    href: "/admin/orders",
    icon: ShoppingCart,
    keywords: ["purchases", "sales"],
  },
  {
    name: "Customers",
    href: "/admin/customers",
    icon: Users,
    keywords: ["users", "buyers", "clients"],
  },
  {
    name: "Coupons",
    href: "/admin/coupons",
    icon: Percent,
    keywords: ["discounts", "promotions", "codes"],
  },
  {
    name: "Reviews",
    href: "/admin/reviews",
    icon: Star,
    keywords: ["ratings", "feedback"],
  },
  {
    name: "Content",
    href: "/admin/content",
    icon: FileText,
    keywords: ["pages", "blog", "cms"],
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
    keywords: ["configuration", "preferences"],
  },
];

const quickActions = [
  {
    name: "Create New Product",
    href: "/admin/products/new",
    icon: Plus,
    shortcut: "N",
  },
  {
    name: "View Recent Orders",
    href: "/admin/orders",
    icon: ShoppingCart,
    shortcut: "O",
  },
  {
    name: "Manage Inventory",
    href: "/admin/inventory",
    icon: Warehouse,
    shortcut: "I",
  },
];

export function CommandSearch({ open, onOpenChange }: CommandSearchProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  // Handle keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const runCommand = useCallback(
    (command: () => void) => {
      onOpenChange(false);
      command();
    },
    [onOpenChange]
  );

  const handleSelect = (href: string) => {
    runCommand(() => router.push(href));
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search pages, products, orders..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Search className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No results found for &quot;{search}&quot;
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Try searching for pages, products, or orders
            </p>
          </div>
        </CommandEmpty>

        {!search && (
          <CommandGroup heading="Quick Actions">
            {quickActions.map((action) => (
              <CommandItem
                key={action.href}
                value={action.name}
                onSelect={() => handleSelect(action.href)}
                className="flex items-center gap-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-background">
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{action.name}</span>
                </div>
                <CommandShortcut className="ml-auto">
                  ⌘{action.shortcut}
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Pages">
          {pages.map((page) => (
            <CommandItem
              key={page.href}
              value={`${page.name} ${page.keywords.join(" ")}`}
              onSelect={() => handleSelect(page.href)}
              className="flex items-center gap-3"
            >
              <page.icon className="h-4 w-4 text-muted-foreground" />
              <span>{page.name}</span>
              <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground" />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
