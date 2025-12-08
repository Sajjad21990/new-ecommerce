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
export const STORE_NAME = process.env.STORE_NAME || "STORE";
export const STORE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// ============================================================================
// Types
// ============================================================================

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

interface ShippingUpdateData {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  estimatedDelivery?: string;
}

interface OrderDeliveredData {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  orderId: string;
}

interface OrderCancelledData {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  cancellationReason?: string;
  refundAmount?: string | number;
}

interface ReturnRequestedData {
  customerEmail: string;
  customerName: string;
  returnNumber: string;
  orderNumber: string;
  reason: string;
  items: { name: string; quantity: number }[];
}

interface ReturnStatusUpdateData {
  customerEmail: string;
  customerName: string;
  returnNumber: string;
  orderNumber: string;
  status: "approved" | "rejected" | "refunded";
  refundAmount?: string | number;
  rejectionReason?: string;
  instructions?: string;
}

interface AbandonedCartData {
  customerEmail: string;
  customerName: string;
  items: {
    name: string;
    price: string | number;
    quantity: number;
    image?: string;
  }[];
  totalValue: string | number;
  recoveryUrl: string;
}

interface WelcomeEmailData {
  customerEmail: string;
  customerName: string;
}

interface NewOrderAdminData {
  adminEmail: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: string | number;
  itemsCount: number;
}

interface LowStockAlertData {
  adminEmail: string;
  products: {
    name: string;
    sku: string;
    currentStock: number;
    variant?: string;
  }[];
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatPrice(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

function getBaseEmailTemplate(content: string, previewText?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${previewText ? `<meta name="x-apple-disable-message-reformatting">` : ""}
      <title>${STORE_NAME}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .wrapper {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .header {
          background: #000;
          color: #fff;
          padding: 24px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .content {
          padding: 32px 24px;
        }
        .footer {
          text-align: center;
          padding: 24px;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #eee;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background: #000;
          color: #fff !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
        }
        .button:hover {
          background: #333;
        }
        .alert-box {
          padding: 16px 20px;
          border-radius: 8px;
          margin-bottom: 24px;
        }
        .alert-success { background: #f0fdf4; border-left: 4px solid #22c55e; }
        .alert-info { background: #f0f9ff; border-left: 4px solid #3b82f6; }
        .alert-warning { background: #fffbeb; border-left: 4px solid #f59e0b; }
        .alert-error { background: #fef2f2; border-left: 4px solid #ef4444; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f8f8f8; font-weight: 600; }
      </style>
    </head>
    <body>
      ${previewText ? `<div style="display:none;max-height:0;overflow:hidden">${previewText}</div>` : ""}
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <h1>${STORE_NAME}</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${STORE_NAME}. All rights reserved.</p>
            <p>
              <a href="${STORE_URL}" style="color: #666;">Visit our store</a>
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============================================================================
// Email Functions
// ============================================================================

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

  const content = `
    <div class="alert-box alert-success">
      <h2 style="margin: 0 0 8px; font-size: 20px; color: #166534;">Thank you for your order!</h2>
      <p style="margin: 0; color: #666;">
        Hi ${data.customerName}, we've received your order and will notify you when it ships.
      </p>
    </div>

    <div style="margin-bottom: 24px;">
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

    <div style="margin-bottom: 24px;">
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

    <div style="margin-bottom: 24px;">
      <h3 style="margin: 0 0 15px; font-size: 16px;">Shipping Address</h3>
      <div style="background: #f8f8f8; padding: 15px; border-radius: 8px;">
        <p style="margin: 0 0 5px;"><strong>${data.shippingAddress.fullName}</strong></p>
        <p style="margin: 0 0 5px;">${data.shippingAddress.addressLine1}</p>
        ${data.shippingAddress.addressLine2 ? `<p style="margin: 0 0 5px;">${data.shippingAddress.addressLine2}</p>` : ""}
        <p style="margin: 0 0 5px;">${data.shippingAddress.city}, ${data.shippingAddress.state} - ${data.shippingAddress.pincode}</p>
        <p style="margin: 0;">Phone: ${data.shippingAddress.phone}</p>
      </div>
    </div>

    <div style="text-align: center; padding-top: 16px;">
      <a href="${STORE_URL}/account/orders" class="button">View Order</a>
    </div>
  `;

  const html = getBaseEmailTemplate(content, `Order #${data.orderNumber} confirmed!`);

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

export async function sendShippingUpdateEmail(data: ShippingUpdateData) {
  const content = `
    <div class="alert-box alert-info">
      <h2 style="margin: 0 0 8px; font-size: 20px; color: #1e40af;">Your order is on its way!</h2>
      <p style="margin: 0; color: #666;">
        Hi ${data.customerName}, great news! Your order #${data.orderNumber} has been shipped.
      </p>
    </div>

    ${
      data.trackingNumber
        ? `
    <div style="margin-bottom: 24px;">
      <h3 style="margin: 0 0 15px; font-size: 16px;">Tracking Information</h3>
      <div style="background: #f8f8f8; padding: 15px; border-radius: 8px;">
        ${data.carrier ? `<p style="margin: 0 0 5px;"><strong>Carrier:</strong> ${data.carrier}</p>` : ""}
        <p style="margin: 0 0 5px;"><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
        ${data.estimatedDelivery ? `<p style="margin: 0;"><strong>Estimated Delivery:</strong> ${data.estimatedDelivery}</p>` : ""}
      </div>
    </div>
    `
        : ""
    }

    ${
      data.trackingUrl
        ? `
    <div style="text-align: center; padding-top: 16px;">
      <a href="${data.trackingUrl}" class="button">Track Your Order</a>
    </div>
    `
        : ""
    }
  `;

  const html = getBaseEmailTemplate(content, `Your order #${data.orderNumber} has shipped!`);

  try {
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `Your Order #${data.orderNumber} Has Shipped!`,
      html,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send shipping update email:", error);
    return { success: false, error };
  }
}

export async function sendOrderDeliveredEmail(data: OrderDeliveredData) {
  const content = `
    <div class="alert-box alert-success">
      <h2 style="margin: 0 0 8px; font-size: 20px; color: #166534;">Your order has been delivered!</h2>
      <p style="margin: 0; color: #666;">
        Hi ${data.customerName}, your order #${data.orderNumber} has been delivered successfully.
      </p>
    </div>

    <p style="margin-bottom: 24px;">
      We hope you love your purchase! If you have any questions or concerns about your order,
      please don't hesitate to contact us.
    </p>

    <div style="background: #f8f8f8; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
      <p style="margin: 0 0 12px; font-weight: 600;">How was your experience?</p>
      <p style="margin: 0; color: #666; font-size: 14px;">
        We'd love to hear your feedback. Leave a review and help other customers!
      </p>
    </div>

    <div style="text-align: center;">
      <a href="${STORE_URL}/account/orders/${data.orderId}" class="button">View Order & Leave Review</a>
    </div>
  `;

  const html = getBaseEmailTemplate(content, `Order #${data.orderNumber} delivered!`);

  try {
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `Your Order #${data.orderNumber} Has Been Delivered`,
      html,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send order delivered email:", error);
    return { success: false, error };
  }
}

export async function sendOrderCancelledEmail(data: OrderCancelledData) {
  const content = `
    <div class="alert-box alert-warning">
      <h2 style="margin: 0 0 8px; font-size: 20px; color: #92400e;">Order Cancelled</h2>
      <p style="margin: 0; color: #666;">
        Hi ${data.customerName}, your order #${data.orderNumber} has been cancelled.
      </p>
    </div>

    ${
      data.cancellationReason
        ? `
    <div style="margin-bottom: 24px;">
      <h3 style="margin: 0 0 10px; font-size: 16px;">Reason for Cancellation</h3>
      <p style="margin: 0; color: #666;">${data.cancellationReason}</p>
    </div>
    `
        : ""
    }

    ${
      data.refundAmount
        ? `
    <div style="background: #f0fdf4; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
      <p style="margin: 0;">
        <strong>Refund Amount:</strong> ${formatPrice(data.refundAmount)}<br>
        <span style="font-size: 14px; color: #666;">The refund will be processed within 5-7 business days.</span>
      </p>
    </div>
    `
        : ""
    }

    <p style="margin-bottom: 24px; color: #666;">
      If you have any questions about this cancellation, please contact our support team.
    </p>

    <div style="text-align: center;">
      <a href="${STORE_URL}" class="button">Continue Shopping</a>
    </div>
  `;

  const html = getBaseEmailTemplate(content, `Order #${data.orderNumber} cancelled`);

  try {
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `Order #${data.orderNumber} Has Been Cancelled`,
      html,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send order cancelled email:", error);
    return { success: false, error };
  }
}

export async function sendReturnRequestedEmail(data: ReturnRequestedData) {
  const itemsHtml = data.items
    .map((item) => `<li>${item.name} (Qty: ${item.quantity})</li>`)
    .join("");

  const content = `
    <div class="alert-box alert-info">
      <h2 style="margin: 0 0 8px; font-size: 20px; color: #1e40af;">Return Request Received</h2>
      <p style="margin: 0; color: #666;">
        Hi ${data.customerName}, we've received your return request.
      </p>
    </div>

    <div style="margin-bottom: 24px;">
      <p style="margin: 0 0 5px;"><strong>Return Number:</strong> ${data.returnNumber}</p>
      <p style="margin: 0 0 5px;"><strong>Order Number:</strong> #${data.orderNumber}</p>
      <p style="margin: 0;"><strong>Reason:</strong> ${data.reason}</p>
    </div>

    <div style="margin-bottom: 24px;">
      <h3 style="margin: 0 0 10px; font-size: 16px;">Items for Return</h3>
      <ul style="margin: 0; padding-left: 20px; color: #666;">
        ${itemsHtml}
      </ul>
    </div>

    <div style="background: #f8f8f8; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 14px; color: #666;">
        <strong>What happens next?</strong><br>
        Our team will review your return request within 1-2 business days.
        You'll receive an email with further instructions once approved.
      </p>
    </div>

    <div style="text-align: center;">
      <a href="${STORE_URL}/account/returns" class="button">Track Return Status</a>
    </div>
  `;

  const html = getBaseEmailTemplate(content, `Return request ${data.returnNumber} received`);

  try {
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `Return Request ${data.returnNumber} Received`,
      html,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send return requested email:", error);
    return { success: false, error };
  }
}

export async function sendReturnStatusUpdateEmail(data: ReturnStatusUpdateData) {
  let alertClass = "alert-info";
  let title = "Return Status Update";
  let message = "";

  if (data.status === "approved") {
    alertClass = "alert-success";
    title = "Return Approved!";
    message = `Great news! Your return request for order #${data.orderNumber} has been approved.`;
  } else if (data.status === "rejected") {
    alertClass = "alert-error";
    title = "Return Request Declined";
    message = `Unfortunately, your return request for order #${data.orderNumber} could not be approved.`;
  } else if (data.status === "refunded") {
    alertClass = "alert-success";
    title = "Refund Processed!";
    message = `Your refund for order #${data.orderNumber} has been processed.`;
  }

  const content = `
    <div class="alert-box ${alertClass}">
      <h2 style="margin: 0 0 8px; font-size: 20px;">${title}</h2>
      <p style="margin: 0; color: #666;">
        Hi ${data.customerName}, ${message}
      </p>
    </div>

    <div style="margin-bottom: 24px;">
      <p style="margin: 0 0 5px;"><strong>Return Number:</strong> ${data.returnNumber}</p>
      <p style="margin: 0;"><strong>Order Number:</strong> #${data.orderNumber}</p>
    </div>

    ${
      data.status === "approved" && data.instructions
        ? `
    <div style="background: #f8f8f8; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 10px; font-size: 16px;">Return Instructions</h3>
      <p style="margin: 0; color: #666;">${data.instructions}</p>
    </div>
    `
        : ""
    }

    ${
      data.status === "rejected" && data.rejectionReason
        ? `
    <div style="margin-bottom: 24px;">
      <h3 style="margin: 0 0 10px; font-size: 16px;">Reason</h3>
      <p style="margin: 0; color: #666;">${data.rejectionReason}</p>
    </div>
    `
        : ""
    }

    ${
      data.refundAmount
        ? `
    <div style="background: #f0fdf4; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
      <p style="margin: 0;">
        <strong>Refund Amount:</strong> ${formatPrice(data.refundAmount)}<br>
        <span style="font-size: 14px; color: #666;">
          ${data.status === "refunded" ? "The refund has been credited to your original payment method." : "Will be processed upon receiving the returned items."}
        </span>
      </p>
    </div>
    `
        : ""
    }

    <div style="text-align: center;">
      <a href="${STORE_URL}/account/returns" class="button">View Return Details</a>
    </div>
  `;

  const statusText = data.status.charAt(0).toUpperCase() + data.status.slice(1);
  const html = getBaseEmailTemplate(content, `Return ${data.returnNumber} ${statusText}`);

  try {
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `Return ${data.returnNumber} ${statusText}`,
      html,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send return status email:", error);
    return { success: false, error };
  }
}

export async function sendAbandonedCartEmail(data: AbandonedCartData) {
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">` : ""}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <strong>${item.name}</strong><br>
          <span style="color: #666;">Qty: ${item.quantity}</span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
          ${formatPrice(item.price)}
        </td>
      </tr>
    `
    )
    .join("");

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px; font-size: 24px;">Forgot something?</h2>
      <p style="margin: 0; color: #666;">
        Hi ${data.customerName}, you left some items in your cart!
      </p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding: 12px; text-align: right; font-weight: bold;">
            Cart Total:
          </td>
          <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px;">
            ${formatPrice(data.totalValue)}
          </td>
        </tr>
      </tfoot>
    </table>

    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${data.recoveryUrl}" class="button" style="font-size: 16px; padding: 16px 32px;">
        Complete Your Purchase
      </a>
    </div>

    <p style="text-align: center; color: #666; font-size: 14px;">
      Need help? Reply to this email or contact our support team.
    </p>
  `;

  const html = getBaseEmailTemplate(content, "You left items in your cart!");

  try {
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `${data.customerName}, you forgot something!`,
      html,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send abandoned cart email:", error);
    return { success: false, error };
  }
}

export async function sendWelcomeEmail(data: WelcomeEmailData) {
  const content = `
    <div style="text-align: center; margin-bottom: 32px;">
      <h2 style="margin: 0 0 8px; font-size: 28px;">Welcome to ${STORE_NAME}!</h2>
      <p style="margin: 0; color: #666; font-size: 16px;">
        Hi ${data.customerName}, thanks for creating an account!
      </p>
    </div>

    <div style="background: #f8f8f8; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px; font-size: 18px;">What you can do now:</h3>
      <ul style="margin: 0; padding-left: 20px; color: #666;">
        <li style="margin-bottom: 8px;">Browse our latest collection</li>
        <li style="margin-bottom: 8px;">Save items to your wishlist</li>
        <li style="margin-bottom: 8px;">Track your orders easily</li>
        <li style="margin-bottom: 8px;">Get exclusive member offers</li>
      </ul>
    </div>

    <div style="text-align: center;">
      <a href="${STORE_URL}" class="button" style="font-size: 16px;">Start Shopping</a>
    </div>
  `;

  const html = getBaseEmailTemplate(content, `Welcome to ${STORE_NAME}!`);

  try {
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `Welcome to ${STORE_NAME}!`,
      html,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return { success: false, error };
  }
}

export async function sendNewOrderAdminEmail(data: NewOrderAdminData) {
  const content = `
    <div class="alert-box alert-success">
      <h2 style="margin: 0 0 8px; font-size: 20px; color: #166534;">New Order Received!</h2>
      <p style="margin: 0; color: #666;">
        A new order has been placed on your store.
      </p>
    </div>

    <div style="margin-bottom: 24px;">
      <table style="width: 100%;">
        <tr>
          <td style="padding: 8px 0;"><strong>Order Number:</strong></td>
          <td style="padding: 8px 0;">#${data.orderNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Customer:</strong></td>
          <td style="padding: 8px 0;">${data.customerName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Email:</strong></td>
          <td style="padding: 8px 0;">${data.customerEmail}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Items:</strong></td>
          <td style="padding: 8px 0;">${data.itemsCount} item(s)</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Total:</strong></td>
          <td style="padding: 8px 0; font-size: 18px; font-weight: bold;">${formatPrice(data.total)}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center;">
      <a href="${STORE_URL}/admin/orders" class="button">View in Admin</a>
    </div>
  `;

  const html = getBaseEmailTemplate(content, `New order #${data.orderNumber}!`);

  try {
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: data.adminEmail,
      subject: `New Order #${data.orderNumber} - ${formatPrice(data.total)}`,
      html,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send new order admin email:", error);
    return { success: false, error };
  }
}

export async function sendLowStockAlertEmail(data: LowStockAlertData) {
  const productsHtml = data.products
    .map(
      (p) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <strong>${p.name}</strong>
          ${p.variant ? `<br><span style="color: #666; font-size: 14px;">${p.variant}</span>` : ""}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${p.sku}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
          <span style="color: ${p.currentStock <= 0 ? "#dc2626" : "#f59e0b"}; font-weight: bold;">
            ${p.currentStock}
          </span>
        </td>
      </tr>
    `
    )
    .join("");

  const content = `
    <div class="alert-box alert-warning">
      <h2 style="margin: 0 0 8px; font-size: 20px; color: #92400e;">Low Stock Alert</h2>
      <p style="margin: 0; color: #666;">
        ${data.products.length} product(s) need your attention.
      </p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <thead>
        <tr style="background: #f8f8f8;">
          <th style="padding: 12px; text-align: left;">Product</th>
          <th style="padding: 12px; text-align: left;">SKU</th>
          <th style="padding: 12px; text-align: center;">Stock</th>
        </tr>
      </thead>
      <tbody>
        ${productsHtml}
      </tbody>
    </table>

    <div style="text-align: center;">
      <a href="${STORE_URL}/admin/inventory" class="button">Manage Inventory</a>
    </div>
  `;

  const html = getBaseEmailTemplate(content, `Low stock alert: ${data.products.length} products`);

  try {
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: data.adminEmail,
      subject: `Low Stock Alert: ${data.products.length} Products Need Attention`,
      html,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send low stock alert email:", error);
    return { success: false, error };
  }
}
