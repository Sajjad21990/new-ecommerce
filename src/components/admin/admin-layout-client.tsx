"use client";

import { useState, useEffect } from "react";
import { AdminHeader } from "./admin-header";
import { AdminSidebar } from "./admin-sidebar";
import { CommandSearch } from "./command-search";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface AdminLayoutClientProps {
  children: React.ReactNode;
}

const SIDEBAR_COLLAPSED_KEY = "admin-sidebar-collapsed";

export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Load saved sidebar state
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  // Save sidebar state
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState));
  };

  // Handle mobile sidebar toggle
  const handleToggleSidebar = () => {
    // On mobile, open sheet. On desktop, toggle collapse
    if (window.innerWidth < 768) {
      setIsMobileOpen(true);
    } else {
      toggleSidebar();
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <AdminHeader
        onToggleSidebar={handleToggleSidebar}
        onOpenSearch={() => setSearchOpen(true)}
      />

      {/* Mobile Sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="w-[240px] p-0">
          <AdminSidebar isCollapsed={false} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <AdminSidebar isCollapsed={isCollapsed} />
      </div>

      {/* Main Content */}
      <main
        className={cn(
          "min-h-[calc(100vh-3.5rem)] transition-all duration-300 pt-14",
          isCollapsed ? "md:pl-[60px]" : "md:pl-[220px]"
        )}
      >
        <div className="p-4 lg:p-6">{children}</div>
      </main>

      {/* Command Search */}
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
