"use client";

import { useState } from "react";
import { MapPin, Check, X, Loader2, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

interface PincodeCheckerProps {
  className?: string;
}

interface CheckResult {
  available: boolean;
  reason?: string;
  zoneName?: string;
  rate?: number;
  freeShippingThreshold?: number;
  estimatedDays?: string | null;
  city?: string | null;
  state?: string | null;
}

export function PincodeChecker({ className }: PincodeCheckerProps) {
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);

  const checkMutation = trpc.shipping.checkPincode.useMutation({
    onSuccess: (data) => {
      setResult(data);
    },
    onError: () => {
      setResult({ available: false });
    },
  });

  const handleCheck = () => {
    if (pincode.length !== 6) return;
    checkMutation.mutate({ pincode });
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Check Delivery</span>
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="Enter Pincode"
          value={pincode}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, "");
            setPincode(value);
            if (value.length < 6) setResult(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && pincode.length === 6) {
              handleCheck();
            }
          }}
          className="w-32"
        />
        <Button
          variant="outline"
          onClick={handleCheck}
          disabled={pincode.length !== 6 || checkMutation.isPending}
        >
          {checkMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Check"
          )}
        </Button>
      </div>

      {result && (
        <div
          className={cn(
            "p-3 rounded-lg text-sm",
            result.available
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          )}
        >
          {result.available ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-green-700 font-medium">
                <Check className="h-4 w-4" />
                Delivery Available
              </div>
              {result.city && result.state && (
                <p className="text-green-600">
                  {result.city}, {result.state}
                </p>
              )}
              <div className="flex items-center gap-4 text-green-600 mt-2">
                {result.estimatedDays && (
                  <span className="flex items-center gap-1">
                    <Truck className="h-4 w-4" />
                    {result.estimatedDays}
                  </span>
                )}
                {result.rate !== undefined && (
                  <span>
                    Shipping: {result.rate === 0 ? "Free" : formatPrice(result.rate)}
                  </span>
                )}
              </div>
              {result.freeShippingThreshold && result.rate && result.rate > 0 && (
                <p className="text-xs text-green-600">
                  Free shipping on orders above {formatPrice(result.freeShippingThreshold)}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-700">
              <X className="h-4 w-4" />
              Sorry, we don&apos;t deliver to this pincode
            </div>
          )}
        </div>
      )}
    </div>
  );
}
