import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { abandonedCarts } from "@/server/db/schema";
import { eq, and, lt } from "drizzle-orm";
import { sendAbandonedCartEmail } from "@/lib/email";

const CRON_SECRET = process.env.CRON_SECRET;
const STORE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Hours after cart abandonment to send recovery email
const HOURS_THRESHOLD = parseInt(process.env.ABANDONED_CART_HOURS || "1", 10);
// Max emails to send per cron run
const BATCH_LIMIT = parseInt(process.env.ABANDONED_CART_BATCH_SIZE || "10", 10);

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = request.nextUrl.searchParams.get("secret");

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}` && cronSecret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const thresholdDate = new Date(Date.now() - HOURS_THRESHOLD * 60 * 60 * 1000);

    // Find eligible abandoned carts
    const eligibleCarts = await db.query.abandonedCarts.findMany({
      where: and(
        lt(abandonedCarts.createdAt, thresholdDate),
        eq(abandonedCarts.recoveryEmailSent, false),
        eq(abandonedCarts.recovered, false)
      ),
      limit: BATCH_LIMIT,
      with: {
        user: {
          columns: { name: true },
        },
      },
    });

    // Filter out expired carts
    const validCarts = eligibleCarts.filter((c) => c.expiresAt > new Date());

    let sentCount = 0;
    const errors: string[] = [];

    for (const cart of validCarts) {
      const cartData = cart.cartData as Array<{
        name: string;
        price: number;
        quantity: number;
        image?: string;
      }>;

      const customerName = cart.user?.name || "Valued Customer";

      try {
        const result = await sendAbandonedCartEmail({
          customerEmail: cart.email,
          customerName,
          items: cartData.map((item) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
          })),
          totalValue: parseFloat(cart.totalValue),
          recoveryUrl: `${STORE_URL}/cart/recover?token=${cart.recoveryToken}`,
        });

        if (result.success) {
          await db
            .update(abandonedCarts)
            .set({
              recoveryEmailSent: true,
              recoveryEmailSentAt: new Date(),
            })
            .where(eq(abandonedCarts.id, cart.id));

          sentCount++;
        } else {
          errors.push(`Failed to send to ${cart.email}`);
        }
      } catch (error) {
        errors.push(`Error sending to ${cart.email}: ${String(error)}`);
      }
    }

    // Also cleanup expired carts
    await db
      .delete(abandonedCarts)
      .where(lt(abandonedCarts.expiresAt, new Date()));

    return NextResponse.json({
      success: true,
      processed: validCarts.length,
      sent: sentCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

// Also support POST for services that prefer it
export async function POST(request: NextRequest) {
  return GET(request);
}
