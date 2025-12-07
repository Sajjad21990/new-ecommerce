"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import {
  Package,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Download,
  ShoppingBag,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "Pending",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    icon: <Clock className="h-3 w-3" />,
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  processing: {
    label: "Processing",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    icon: <RefreshCw className="h-3 w-3" />,
  },
  shipped: {
    label: "Shipped",
    color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    icon: <Truck className="h-3 w-3" />,
  },
  delivered: {
    label: "Delivered",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    icon: <XCircle className="h-3 w-3" />,
  },
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  pending: {
    label: "Pending",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  paid: {
    label: "Paid",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  failed: {
    label: "Failed",
    color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  refunded: {
    label: "Refunded",
    color: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  },
};

export default function AdminOrdersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  const { data: orders, isLoading, refetch } = trpc.order.adminList.useQuery({
    page,
    limit: pageSize,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const utils = trpc.useUtils();

  const formatPrice = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const filteredOrders = orders?.filter((order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(query) ||
      order.user?.name?.toLowerCase().includes(query) ||
      order.user?.email?.toLowerCase().includes(query) ||
      order.guestEmail?.toLowerCase().includes(query)
    );
  });

  const toggleSelectOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === filteredOrders?.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders?.map((o) => o.id) || []));
    }
  };

  const handleExportCSV = () => {
    toast.info("Export functionality coming soon");
  };

  // Count orders by status
  const statusCounts = {
    all: orders?.length || 0,
    pending: orders?.filter((o) => o.status === "pending").length || 0,
    processing: orders?.filter((o) => o.status === "processing").length || 0,
    shipped: orders?.filter((o) => o.status === "shipped").length || 0,
    delivered: orders?.filter((o) => o.status === "delivered").length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Manage and track customer orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Tabs */}
      <Tabs
        value={statusFilter}
        onValueChange={(v) => {
          setStatusFilter(v as OrderStatus | "all");
          setPage(1);
        }}
      >
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all" className="gap-2">
            All
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {statusCounts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            Pending
            {statusCounts.pending > 0 && (
              <Badge className="ml-1 h-5 px-1.5 bg-amber-500/10 text-amber-600">
                {statusCounts.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="processing" className="gap-2">
            Processing
          </TabsTrigger>
          <TabsTrigger value="shipped" className="gap-2">
            Shipped
          </TabsTrigger>
          <TabsTrigger value="delivered" className="gap-2">
            Delivered
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order #, customer name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background"
          />
        </div>
        <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
          <SelectTrigger className="w-[130px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 per page</SelectItem>
            <SelectItem value="20">20 per page</SelectItem>
            <SelectItem value="50">50 per page</SelectItem>
            <SelectItem value="100">100 per page</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedOrders.size > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {selectedOrders.size} order(s) selected
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedOrders(new Set())}>
                  Clear Selection
                </Button>
                <Button variant="outline" size="sm">
                  Update Status
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders List */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Package className="h-6 w-6 animate-pulse mr-2" />
              <span className="text-muted-foreground">Loading orders...</span>
            </div>
          ) : !filteredOrders || filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <ShoppingBag className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No orders found</p>
              {searchQuery && (
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {/* Header Row */}
              <div className="hidden md:grid grid-cols-[auto,2fr,1fr,1fr,1fr,1fr,auto] gap-4 px-6 py-3 bg-muted/30 text-xs font-medium text-muted-foreground uppercase">
                <div className="flex items-center">
                  <Checkbox
                    checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </div>
                <div>Order</div>
                <div>Date</div>
                <div>Status</div>
                <div>Payment</div>
                <div className="text-right">Total</div>
                <div></div>
              </div>

              {/* Order Rows */}
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className={cn(
                    "grid grid-cols-1 md:grid-cols-[auto,2fr,1fr,1fr,1fr,1fr,auto] gap-4 px-6 py-4 hover:bg-accent/50 transition-colors",
                    selectedOrders.has(order.id) && "bg-primary/5"
                  )}
                >
                  {/* Checkbox */}
                  <div className="flex items-center">
                    <Checkbox
                      checked={selectedOrders.has(order.id)}
                      onCheckedChange={() => toggleSelectOrder(order.id)}
                    />
                  </div>

                  {/* Order Info */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border">
                      <AvatarFallback className="text-xs">
                        {order.user?.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() ||
                          order.guestEmail?.charAt(0).toUpperCase() ||
                          "G"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium text-sm hover:underline"
                      >
                        #{order.orderNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate">
                        {order.user?.name || order.guestEmail || "Guest"}
                      </p>
                      <p className="text-xs text-muted-foreground md:hidden">
                        {order.items.length} item(s)
                      </p>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="hidden md:flex flex-col justify-center">
                    <p className="text-sm">
                      {format(new Date(order.createdAt), "MMM d, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="hidden md:flex items-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1",
                        statusConfig[order.status as OrderStatus]?.color
                      )}
                    >
                      {statusConfig[order.status as OrderStatus]?.icon}
                      {statusConfig[order.status as OrderStatus]?.label || order.status}
                    </Badge>
                  </div>

                  {/* Payment Status */}
                  <div className="hidden md:flex items-center">
                    <Badge
                      variant="outline"
                      className={paymentStatusConfig[order.paymentStatus]?.color}
                    >
                      {paymentStatusConfig[order.paymentStatus]?.label || order.paymentStatus}
                    </Badge>
                  </div>

                  {/* Total */}
                  <div className="hidden md:flex flex-col justify-center text-right">
                    <p className="font-semibold">{formatPrice(order.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.items.length} item(s)
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    {/* Mobile badges */}
                    <div className="flex md:hidden items-center gap-2 mr-auto">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          statusConfig[order.status as OrderStatus]?.color
                        )}
                      >
                        {statusConfig[order.status as OrderStatus]?.label || order.status}
                      </Badge>
                      <span className="font-semibold text-sm">
                        {formatPrice(order.total)}
                      </span>
                    </div>

                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/orders/${order.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/orders/${order.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Download Invoice
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancel Order
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Showing {filteredOrders?.length || 0} order(s)
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <div className="flex items-center gap-1">
            <span className="text-sm px-3 py-1 bg-muted rounded">
              Page {page}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!orders || orders.length < pageSize}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
