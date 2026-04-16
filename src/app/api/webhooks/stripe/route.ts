import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/utils";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  console.log("[stripe webhook] received request");

  if (!sig) {
    console.error("[stripe webhook] Missing stripe-signature");
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log("[stripe webhook] verified event:", event.type);
  } catch (err: any) {
    console.error("[stripe webhook] signature verification failed:", err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("[stripe webhook] checkout.session.completed:", {
          sessionId: session.id,
          paymentIntent: session.payment_intent,
          metadata: session.metadata,
          amount_total: session.amount_total,
        });

        await handleCheckoutCompleted(session);
        console.log("[stripe webhook] order creation finished for session:", session.id);
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log("[stripe webhook] payment failed:", pi.id);

        await prisma.order.updateMany({
          where: { stripePaymentIntentId: pi.id },
          data: { paymentStatus: "FAILED" },
        });
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        console.log("[stripe webhook] charge refunded:", charge.id);

        if (charge.payment_intent) {
          await prisma.order.updateMany({
            where: { stripePaymentIntentId: charge.payment_intent as string },
            data: {
              paymentStatus: "REFUNDED",
              status: "REFUNDED",
            },
          });
        }
        break;
      }

      default:
        console.log("[stripe webhook] ignored event:", event.type);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[stripe webhook] handler failed:", error);
    return NextResponse.json(
      { error: error?.message || "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("[stripe webhook] handleCheckoutCompleted start:", session.id);

  const existing = await prisma.order.findUnique({
    where: { stripeSessionId: session.id },
  });

  if (existing) {
    console.log("[stripe webhook] order already exists:", existing.id);
    return existing;
  }

  const meta = session.metadata ?? {};
  const userId = meta.userId;
  const partnerId = meta.partnerId;
  const addressId = meta.addressId || null;
  const promotionId = meta.promotionId || null;
  const items = JSON.parse(meta.items || "[]") as any[];

  console.log("[stripe webhook] parsed metadata:", {
    userId,
    partnerId,
    addressId,
    promotionId,
    itemsCount: items.length,
  });

  if (!userId || !partnerId || items.length === 0) {
    throw new Error("Missing required checkout metadata");
  }

  const subtotal = session.amount_subtotal ?? 0;
  const total = session.amount_total ?? 0;
  const discountAmount = subtotal - total;

  const hasServiceItems = items.some((item) => item.type === "SERVICE");
  const hasProductItems = items.some((item) => item.type === "PHYSICAL");
  const orderStatus =
    hasServiceItems && !hasProductItems
      ? "BOOKING_CONFIRMED"
      : "READY_FOR_COLLECTION";

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId,
      partnerId,
      addressId,
      promotionId,
      status: orderStatus,
      paymentStatus: "PAID",
      subtotal,
      discountAmount,
      deliveryFee: 0,
      tax: 0,
      total,
      stripeSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      items: {
        create: items.map((item: any) => ({
          productId: item.type === "PHYSICAL" ? item.id : null,
          serviceId: item.type === "SERVICE" ? item.id : null,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
          itemType: item.type,
        })),
      },
    },
  });

  console.log("[stripe webhook] order created:", {
    orderId: order.id,
    orderNumber: order.orderNumber,
  });

  for (const item of items) {
    if (item.type === "PHYSICAL") {
      await prisma.product.update({
        where: { id: item.id },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }
  }

  if (promotionId) {
    await prisma.promotion.update({
      where: { id: promotionId },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });
  }

  return order;
}