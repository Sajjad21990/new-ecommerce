"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Package,
  Loader2,
  ArrowLeft,
  CheckCircle,
  Clock,
  Truck,
  MapPin,
  Download,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const paymentStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
};

const orderStatusSteps = [
  { status: "confirmed", label: "Confirmed", icon: CheckCircle },
  { status: "processing", label: "Processing", icon: Package },
  { status: "shipped", label: "Shipped", icon: Truck },
  { status: "delivered", label: "Delivered", icon: MapPin },
];

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { status: authStatus } = useSession();
  const orderId = params.id as string;

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/account/orders");
    }
  }, [authStatus, router]);

  const { data: order, isLoading } = trpc.order.getById.useQuery(
    { id: orderId },
    { enabled: authStatus === "authenticated" && !!orderId }
  );

  const formatPrice = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getStatusIndex = (status: string) => {
    if (status === "pending") return -1;
    if (status === "cancelled") return -1;
    return orderStatusSteps.findIndex((s) => s.status === status);
  };

  if (authStatus === "loading" || isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <Package className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-4">Order not found</h1>
          <p className="text-muted-foreground mb-8">
            This order doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Button asChild size="lg">
            <Link href="/account/orders">View All Orders</Link>
          </Button>
        </div>
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/account/orders"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
          <p className="text-muted-foreground">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/orders/${order.id}/invoice`, "_blank")}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Invoice
          </Button>
          <Badge className={statusColors[order.status] || ""}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
          <Badge className={paymentStatusColors[order.paymentStatus] || ""}>
            Payment: {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Order Status Timeline */}
      {order.status !== "cancelled" && order.status !== "pending" && (
        <div className="border rounded-lg p-6 mb-8">
          <h2 className="font-semibold mb-6">Order Status</h2>
          <div className="flex items-center justify-between">
            {orderStatusSteps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;

              return (
                <div key={step.status} className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? "bg-green-500 text-white"
                        : "bg-gray-100 text-gray-400"
                    } ${isCurrent ? "ring-2 ring-green-500 ring-offset-2" : ""}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={`text-xs mt-2 ${
                      isCompleted ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                  {index < orderStatusSteps.length - 1 && (
                    <div
                      className={`absolute h-0.5 w-full top-5 left-1/2 ${
                        index < currentStatusIndex ? "bg-green-500" : "bg-gray-200"
                      }`}
                      style={{ display: "none" }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {order.status === "pending" && (
        <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-6 mb-8">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-yellow-600" />
            <div>
              <h2 className="font-semibold text-yellow-800">Payment Pending</h2>
              <p className="text-sm text-yellow-700">
                Your order is awaiting payment confirmation.
              </p>
            </div>
          </div>
        </div>
      )}

      {order.status === "cancelled" && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-6 mb-8">
          <h2 className="font-semibold text-red-800">Order Cancelled</h2>
          <p className="text-sm text-red-700">
            This order has been cancelled.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Order Items */}
        <div className="lg:col-span-2">
          <div className="border rounded-lg p-6">
            <h2 className="font-semibold mb-4">
              Items ({order.items.length})
            </h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="relative w-20 h-24 bg-muted rounded overflow-hidden flex-shrink-0">
                    {item.product?.images?.[0]?.url ? (
                      <Image
                        src={item.product.images[0].url}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        No img
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Link
                      href={`/products/${item.product?.slug || item.productId}`}
                      className="font-medium hover:underline"
                    >
                      {item.name}
                    </Link>
                    {(item.size || item.color) && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.size && `Size: ${item.size}`}
                        {item.size && item.color && " | "}
                        {item.color && `Color: ${item.color}`}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-muted-foreground">
                        Qty: {item.quantity}
                      </span>
                      <span className="font-medium">
                        {formatPrice(item.total)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Summary & Shipping */}
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="border rounded-lg p-6">
            <h2 className="font-semibold mb-4">Order Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>
                  {parseFloat(order.shippingCost || "0") === 0 ? (
                    <span className="text-green-600">Free</span>
                  ) : (
                    formatPrice(order.shippingCost || "0")
                  )}
                </span>
              </div>
              {parseFloat(order.discount || "0") > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-green-600">
                    -{formatPrice(order.discount || "0")}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="border rounded-lg p-6">
            <h2 className="font-semibold mb-4">Shipping Address</h2>
            <div className="text-sm space-y-1">
              <p className="font-medium">{shippingAddress.fullName}</p>
              <p>{shippingAddress.addressLine1}</p>
              {shippingAddress.addressLine2 && (
                <p>{shippingAddress.addressLine2}</p>
              )}
              <p>
                {shippingAddress.city}, {shippingAddress.state} -{" "}
                {shippingAddress.pincode}
              </p>
              <p className="pt-2">
                <span className="text-muted-foreground">Phone:</span>{" "}
                {shippingAddress.phone}
              </p>
              <p>
                <span className="text-muted-foreground">Email:</span>{" "}
                {shippingAddress.email}
              </p>
            </div>
          </div>

          {/* Payment Info */}
          {order.paymentMethod && (
            <div className="border rounded-lg p-6">
              <h2 className="font-semibold mb-4">Payment Information</h2>
              <div className="text-sm space-y-2">
                <p>
                  <span className="text-muted-foreground">Method:</span>{" "}
                  {order.paymentMethod.charAt(0).toUpperCase() +
                    order.paymentMethod.slice(1)}
                </p>
                {order.razorpayPaymentId && (
                  <p>
                    <span className="text-muted-foreground">Payment ID:</span>{" "}
                    {order.razorpayPaymentId}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
