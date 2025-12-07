import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { eq, or } from "drizzle-orm";
import { orders } from "@/server/db/schema";
import { InvoiceDocument } from "@/lib/invoice-pdf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: orderId } = await params;

    // Fetch order with all details
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        items: {
          with: {
            product: {
              columns: { id: true, name: true, slug: true },
            },
          },
        },
        user: {
          columns: { id: true, name: true, email: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check authorization
    // Allow if: user is admin OR user is the order owner
    const isAdmin = session?.user?.role === "admin";
    const isOwner = session?.user?.id === order.userId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get store settings
    const storeSettings = await db.query.settings.findMany({
      where: or(
        eq(orders.id, "store_name"),
        eq(orders.id, "store_email"),
        eq(orders.id, "store_phone"),
        eq(orders.id, "store_address"),
        eq(orders.id, "tax_id")
      ),
    });

    const settingsMap = new Map(
      storeSettings.map((s) => [s.key, s.value])
    );

    const storeInfo: {
      name: string;
      email: string;
      phone: string;
      address: string;
      taxId: string;
    } = {
      name: (settingsMap.get("store_name") || "Store Name") as string,
      email: (settingsMap.get("store_email") || "") as string,
      phone: (settingsMap.get("store_phone") || "") as string,
      address: (settingsMap.get("store_address") || "") as string,
      taxId: (settingsMap.get("tax_id") || "") as string,
    };

    // Prepare order data for invoice
    const shippingAddr = order.shippingAddress as Record<string, unknown> | null;
    const invoiceData = {
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      customerName: order.user?.name ?? (shippingAddr && typeof shippingAddr === 'object' && 'fullName' in shippingAddr ? String(shippingAddr.fullName) : "Guest"),
      customerEmail: order.user?.email || order.guestEmail || "",
      shippingAddress: shippingAddr && typeof shippingAddr === 'object'
        ? {
            fullName: String(('fullName' in shippingAddr ? shippingAddr.fullName : "") ?? ""),
            address: String(('address' in shippingAddr ? shippingAddr.address : ('addressLine1' in shippingAddr ? shippingAddr.addressLine1 : "")) ?? ""),
            city: String(('city' in shippingAddr ? shippingAddr.city : "") ?? ""),
            state: String(('state' in shippingAddr ? shippingAddr.state : "") ?? ""),
            pincode: String(('pincode' in shippingAddr ? shippingAddr.pincode : "") ?? ""),
            phone: String(('phone' in shippingAddr ? shippingAddr.phone : "") ?? ""),
          }
        : {
            fullName: "",
            address: "",
            city: "",
            state: "",
            pincode: "",
            phone: "",
          },
      items: order.items.map((item) => ({
        name: item.name,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      })),
      subtotal: order.subtotal,
      discount: order.discount,
      shippingCost: order.shippingCost,
      tax: order.tax,
      total: order.total,
      paymentMethod: order.paymentMethod || "Cash on Delivery",
      paymentStatus: order.paymentStatus,
    };

    // Generate PDF
    const pdfElement = React.createElement(InvoiceDocument, { order: invoiceData, storeInfo });
    const stream = await renderToStream(pdfElement as React.ReactElement<DocumentProps>);

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Return PDF
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${order.orderNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating invoice:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice" },
      { status: 500 }
    );
  }
}
