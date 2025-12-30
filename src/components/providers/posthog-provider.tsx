"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Initialize PostHog only on client side
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
    capture_pageview: false, // We'll handle this manually for better control
    capture_pageleave: true,
    persistence: "localStorage",
  });
}

function PostHogPageviewInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && typeof window !== "undefined") {
      let url = window.origin + pathname;
      if (searchParams?.toString()) {
        url = url + "?" + searchParams.toString();
      }
      posthog.capture("$pageview", {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

function PostHogPageview() {
  return (
    <Suspense fallback={null}>
      <PostHogPageviewInner />
    </Suspense>
  );
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  // Only render provider if PostHog key is available
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <PostHogPageview />
      {children}
    </PHProvider>
  );
}

// Analytics event helpers for use throughout the app
export const analytics = {
  // Product events
  viewProduct: (productId: string, productName: string, price: number) => {
    posthog.capture("product_viewed", {
      product_id: productId,
      product_name: productName,
      price,
    });
  },

  // Cart events
  addToCart: (productId: string, productName: string, price: number, quantity: number) => {
    posthog.capture("add_to_cart", {
      product_id: productId,
      product_name: productName,
      price,
      quantity,
      value: price * quantity,
    });
  },

  removeFromCart: (productId: string, productName: string) => {
    posthog.capture("remove_from_cart", {
      product_id: productId,
      product_name: productName,
    });
  },

  // Checkout events
  beginCheckout: (cartTotal: number, itemCount: number) => {
    posthog.capture("begin_checkout", {
      value: cartTotal,
      item_count: itemCount,
    });
  },

  purchaseComplete: (orderId: string, orderTotal: number, itemCount: number) => {
    posthog.capture("purchase", {
      order_id: orderId,
      value: orderTotal,
      item_count: itemCount,
    });
  },

  // Search events
  search: (query: string, resultsCount: number) => {
    posthog.capture("search", {
      search_query: query,
      results_count: resultsCount,
    });
  },

  // User identification
  identifyUser: (userId: string, email?: string, name?: string) => {
    posthog.identify(userId, {
      email,
      name,
    });
  },

  // Reset on logout
  reset: () => {
    posthog.reset();
  },
};
