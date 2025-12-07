import { db } from "@/server/db";
import { adminNotifications } from "@/server/db/schema";

type NotificationType = "order" | "inventory" | "review" | "return" | "customer" | "system";

interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create an admin notification
 */
export async function createNotification(params: CreateNotificationParams) {
  const [notification] = await db
    .insert(adminNotifications)
    .values({
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
      metadata: params.metadata,
    })
    .returning();

  return notification;
}

/**
 * Notification templates for common events
 */
export const notificationTemplates = {
  // Order notifications
  newOrder: (orderNumber: string, total: string) =>
    createNotification({
      type: "order",
      title: `New Order #${orderNumber}`,
      message: `A new order worth ₹${total} has been placed`,
      link: `/admin/orders`,
    }),

  orderPaid: (orderNumber: string) =>
    createNotification({
      type: "order",
      title: `Payment Received`,
      message: `Payment confirmed for Order #${orderNumber}`,
      link: `/admin/orders`,
    }),

  orderCancelled: (orderNumber: string) =>
    createNotification({
      type: "order",
      title: `Order Cancelled`,
      message: `Order #${orderNumber} has been cancelled`,
      link: `/admin/orders`,
    }),

  // Inventory notifications
  lowStock: (productName: string, variantInfo: string, stock: number) =>
    createNotification({
      type: "inventory",
      title: `Low Stock Alert`,
      message: `${productName} (${variantInfo}) is low on stock (${stock} remaining)`,
      link: `/admin/inventory`,
    }),

  outOfStock: (productName: string, variantInfo: string) =>
    createNotification({
      type: "inventory",
      title: `Out of Stock`,
      message: `${productName} (${variantInfo}) is now out of stock`,
      link: `/admin/inventory`,
    }),

  // Review notifications
  newReview: (productName: string, rating: number) =>
    createNotification({
      type: "review",
      title: `New Review`,
      message: `A ${rating}-star review was submitted for ${productName}`,
      link: `/admin/reviews`,
    }),

  // Return notifications
  returnRequested: (orderNumber: string) =>
    createNotification({
      type: "return",
      title: `Return Requested`,
      message: `A return has been requested for Order #${orderNumber}`,
      link: `/admin/orders`,
    }),

  // Customer notifications
  newCustomer: (customerEmail: string) =>
    createNotification({
      type: "customer",
      title: `New Customer`,
      message: `${customerEmail} just created an account`,
      link: `/admin/customers`,
    }),

  // System notifications
  systemAlert: (message: string) =>
    createNotification({
      type: "system",
      title: `System Alert`,
      message,
    }),
};
