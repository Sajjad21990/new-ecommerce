import { Resend } from "resend";

// Lazy initialization to avoid build-time errors
let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured. Email features will not work.");
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY || "");
  }
  return resendInstance;
}

export const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";
export const STORE_NAME = "STORE";

interface OrderItem {
  name: string;
  quantity: number;
  price: string | number;
  size?: string | null;
  color?: string | null;
}

interface OrderAddress {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
}

interface OrderConfirmationData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: string | number;
  shipping: string | number;
  discount?: string | number;
  total: string | number;
  shippingAddress: OrderAddress;
  paymentMethod?: string;
}

function formatPrice(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

export async function sendOrderConfirmationEmail(data: OrderConfirmationData) {
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
          <strong>${item.name}</strong>
          ${item.size ? `<br><span style="color: #666; font-size: 14px;">Size: ${item.size}</span>` : ""}
          ${item.color ? `<br><span style="color: #666; font-size: 14px;">Color: ${item.color}</span>` : ""}
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right;">
          ${formatPrice(item.price)}
        </td>
      </tr>
    `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 24px; margin: 0;">${STORE_NAME}</h1>
      </div>

      <div style="background: #f8f8f8; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
        <h2 style="margin: 0 0 10px; font-size: 20px;">Thank you for your order!</h2>
        <p style="margin: 0; color: #666;">
          Hi ${data.customerName}, we've received your order and will notify you when it ships.
        </p>
      </div>

      <div style="margin-bottom: 30px;">
        <p style="margin: 0 0 5px;"><strong>Order Number:</strong> #${data.orderNumber}</p>
        <p style="margin: 0;"><strong>Date:</strong> ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      <h3 style="margin: 0 0 15px; font-size: 16px;">Order Summary</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #f8f8f8;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="margin-bottom: 30px;">
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
          <span>Subtotal</span>
          <span>${formatPrice(data.subtotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
          <span>Shipping</span>
          <span>${parseFloat(data.shipping.toString()) === 0 ? "Free" : formatPrice(data.shipping)}</span>
        </div>
        ${
          data.discount && parseFloat(data.discount.toString()) > 0
            ? `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #22c55e;">
          <span>Discount</span>
          <span>-${formatPrice(data.discount)}</span>
        </div>
        `
            : ""
        }
        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #ddd; font-size: 18px; font-weight: bold;">
          <span>Total</span>
          <span>${formatPrice(data.total)}</span>
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <h3 style="margin: 0 0 15px; font-size: 16px;">Shipping Address</h3>
        <div style="background: #f8f8f8; padding: 15px; border-radius: 8px;">
          <p style="margin: 0 0 5px;"><strong>${data.shippingAddress.fullName}</strong></p>
          <p style="margin: 0 0 5px;">${data.shippingAddress.addressLine1}</p>
          ${data.shippingAddress.addressLine2 ? `<p style="margin: 0 0 5px;">${data.shippingAddress.addressLine2}</p>` : ""}
          <p style="margin: 0 0 5px;">${data.shippingAddress.city}, ${data.shippingAddress.state} - ${data.shippingAddress.pincode}</p>
          <p style="margin: 0;">Phone: ${data.shippingAddress.phone}</p>
        </div>
      </div>

      <div style="text-align: center; padding: 30px 0; border-top: 1px solid #eee;">
        <p style="margin: 0 0 10px; color: #666;">
          If you have any questions, reply to this email or contact us at support@store.com
        </p>
        <p style="margin: 0; color: #666;">
          Thank you for shopping with ${STORE_NAME}!
        </p>
      </div>
    </body>
    </html>
  `;

  try {
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `Order Confirmed - #${data.orderNumber}`,
      html,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
    return { success: false, error };
  }
}

export async function sendShippingUpdateEmail({
  customerEmail,
  customerName,
  orderNumber,
  trackingNumber,
  carrier,
}: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  trackingNumber?: string;
  carrier?: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Order Has Shipped</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 24px; margin: 0;">${STORE_NAME}</h1>
      </div>

      <div style="background: #f0fdf4; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
        <h2 style="margin: 0 0 10px; font-size: 20px; color: #166534;">Your order is on its way!</h2>
        <p style="margin: 0; color: #666;">
          Hi ${customerName}, great news! Your order #${orderNumber} has been shipped.
        </p>
      </div>

      ${
        trackingNumber
          ? `
      <div style="margin-bottom: 30px;">
        <h3 style="margin: 0 0 15px; font-size: 16px;">Tracking Information</h3>
        <div style="background: #f8f8f8; padding: 15px; border-radius: 8px;">
          ${carrier ? `<p style="margin: 0 0 5px;"><strong>Carrier:</strong> ${carrier}</p>` : ""}
          <p style="margin: 0;"><strong>Tracking Number:</strong> ${trackingNumber}</p>
        </div>
      </div>
      `
          : ""
      }

      <div style="text-align: center; padding: 30px 0; border-top: 1px solid #eee;">
        <p style="margin: 0 0 10px; color: #666;">
          Thank you for shopping with ${STORE_NAME}!
        </p>
      </div>
    </body>
    </html>
  `;

  try {
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: `Your Order #${orderNumber} Has Shipped!`,
      html,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send shipping update email:", error);
    return { success: false, error };
  }
}
