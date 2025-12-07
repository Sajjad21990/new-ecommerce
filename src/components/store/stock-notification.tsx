"use client";

import { useState } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

interface StockNotificationProps {
  productId: string;
  productName: string;
  variantId?: string;
  variantLabel?: string; // e.g., "Size M, Blue"
}

export function StockNotification({
  productId,
  productName,
  variantId,
  variantLabel,
}: StockNotificationProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  const subscribeMutation = trpc.stockNotification.subscribe.useMutation({
    onSuccess: () => {
      toast.success("You'll be notified when this item is back in stock!");
      setOpen(false);
      setEmail("");
    },
    onError: (error) => {
      if (error.message.includes("already subscribed")) {
        toast.info("You're already subscribed to notifications for this item");
      } else {
        toast.error("Failed to subscribe. Please try again.");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    subscribeMutation.mutate({
      email,
      productId,
      variantId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Bell className="mr-2 h-4 w-4" />
          Notify Me When Available
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            Get Notified
          </DialogTitle>
          <DialogDescription>
            We&apos;ll email you when <strong>{productName}</strong>
            {variantLabel && <> ({variantLabel})</>} is back in stock.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={subscribeMutation.isPending}
          >
            {subscribeMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subscribing...
              </>
            ) : (
              "Notify Me"
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            We&apos;ll only use your email to notify you about this product.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
