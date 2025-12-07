"use client";

import { use, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  Package,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Truck,
  MapPin,
  User,
  Mail,
  Phone,
  Download,
  Clock,
  XCircle,
  RefreshCw,
  CreditCard,
  Receipt,
  ShoppingBag,
  FileText,
  ImageIcon,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "Pending",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    icon: <Clock className="h-4 w-4" />,
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  processing: {
    label: "Processing",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    icon: <RefreshCw className="h-4 w-4" />,
  },
  shipped: {
    label: "Shipped",
    color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    icon: <Truck className="h-4 w-4" />,
  },
  delivered: {
    label: "Delivered",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    icon: <XCircle className="h-4 w-4" />,
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

const orderStatusSteps = [
  { status: "confirmed", label: "Confirmed", icon: CheckCircle },
  { status: "processing", label: "Processing", icon: Package },
  { status: "shipped", label: "Shipped", icon: Truck },
  { status: "delivered", label: "Delivered", icon: MapPin },
];

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: orderId } = use(params);
  const [isUpdating, setIsUpdating] = useState(false);

  const utils = trpc.useUtils();

  const { data: orders, isLoading } = trpc.order.adminList.useQuery({
    page: 1,
    limit: 100,
  });

  const order = orders?.find((o) => o.id === orderId);

  const updateStatus = trpc.order.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Order status updated");
      utils.order.adminList.invalidate();
    },
    onError: () => {
      toast.error("Failed to update status");
    },
    onSettled: () => {
      setIsUpdating(false);
    },
  });

  const handleStatusChange = (newStatus: OrderStatus) => {
    setIsUpdating(true);
    updateStatus.mutate({ id: orderId, status: newStatus });
  };

  const formatPrice = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getStatusIndex = (status: string) => {
    if (status === "pending") return -1;
    if (status === "cancelled") return -1;
    return orderStatusSteps.findIndex((s) => s.status === status);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-[200px]" />
            <Skeleton className="h-[300px]" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-[150px]" />
            <Skeleton className="h-[200px]" />
            <Skeleton className="h-[150px]" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Order not found</h2>
        <p className="text-muted-foreground mb-4">
          This order doesn&apos;t exist or has been deleted.
        </p>
        <Button asChild>
          <Link href="/admin/orders">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Link>
        </Button>
      </div>
    );
  }

  const shippingAddress = order.shippingAddress as {
    fullName: string;
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
  };

  const currentStatusIndex = getStatusIndex(order.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                Order #{order.orderNumber}
              </h1>
              <Badge
                variant="outline"
                className={cn("gap-1", statusConfig[order.status as OrderStatus]?.color)}
              >
                {statusConfig[order.status as OrderStatus]?.icon}
                {statusConfig[order.status as OrderStatus]?.label || order.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Placed {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })} •{" "}
              {format(new Date(order.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-14 lg:ml-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/orders/${order.id}/invoice`, "_blank")}
          >
            <Download className="mr-2 h-4 w-4" />
            Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Update */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Update Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Select
                  value={order.status}
                  onValueChange={(value) => handleStatusChange(value as OrderStatus)}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="w-[200px] bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
            </CardContent>
          </Card>

          {/* Order Progress Timeline */}
          {order.status !== "cancelled" && order.status !== "pending" && (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Order Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {orderStatusSteps.map((step, index) => {
                    const Icon = step.icon;
                    const isCompleted = index <= currentStatusIndex;
                    const isCurrent = index === currentStatusIndex;

                    return (
                      <div key={step.status} className="flex flex-col items-center relative">
                        {index < orderStatusSteps.length - 1 && (
                          <div
                            className={cn(
                              "absolute top-5 left-[calc(50%+20px)] w-[calc(100%-40px)] h-0.5",
                              isCompleted ? "bg-emerald-500" : "bg-muted"
                            )}
                          />
                        )}
                        <div
                          className={cn(
                            "relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all",
                            isCompleted
                              ? "bg-emerald-500 text-white"
                              : "bg-muted text-muted-foreground",
                            isCurrent && "ring-2 ring-emerald-500 ring-offset-2 ring-offset-background"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span
                          className={cn(
                            "text-xs mt-2 font-medium",
                            isCompleted ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Items */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Order Items ({order.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-3 rounded-lg border bg-background"
                  >
                    <div className="relative w-16 h-20 bg-muted rounded-lg overflow-hidden shrink-0">
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.name}</p>
                      {item.sku && (
                        <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                      )}
                      {(item.size || item.color) && (
                        <div className="flex items-center gap-2 mt-1">
                          {item.size && (
                            <Badge variant="secondary" className="text-xs">
                              {item.size}
                            </Badge>
                          )}
                          {item.color && (
                            <Badge variant="secondary" className="text-xs">
                              {item.color}
                            </Badge>
                          )}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-muted-foreground">
                          {formatPrice(item.price)} × {item.quantity}
                        </span>
                        <span className="font-semibold">{formatPrice(item.total)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Notes */}
          {order.notes && (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Order Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-12 w-12 border">
                  <AvatarFallback>
                    {order.user?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() ||
                      order.guestEmail?.charAt(0).toUpperCase() ||
                      "G"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{order.user?.name || "Guest"}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.user?.email || order.guestEmail || "No email"}
                  </p>
                </div>
              </div>
              {order.user && (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/admin/customers/${order.user.id}`}>View Customer</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-1">
                <p className="font-medium">{shippingAddress.fullName}</p>
                <p className="text-muted-foreground">{shippingAddress.addressLine1}</p>
                {shippingAddress.addressLine2 && (
                  <p className="text-muted-foreground">{shippingAddress.addressLine2}</p>
                )}
                <p className="text-muted-foreground">
                  {shippingAddress.city}, {shippingAddress.state} - {shippingAddress.pincode}
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{shippingAddress.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{shippingAddress.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>
                  {parseFloat(order.shippingCost || "0") === 0 ? (
                    <span className="text-emerald-600">Free</span>
                  ) : (
                    formatPrice(order.shippingCost || "0")
                  )}
                </span>
              </div>
              {parseFloat(order.discount || "0") > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-emerald-600">
                    -{formatPrice(order.discount || "0")}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-lg">{formatPrice(order.total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge
                  variant="outline"
                  className={paymentStatusConfig[order.paymentStatus]?.color}
                >
                  {paymentStatusConfig[order.paymentStatus]?.label || order.paymentStatus}
                </Badge>
              </div>
              {order.paymentMethod && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Method</span>
                  <span className="capitalize">{order.paymentMethod}</span>
                </div>
              )}
              {order.razorpayPaymentId && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground">
                    Payment ID: <span className="font-mono">{order.razorpayPaymentId}</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
