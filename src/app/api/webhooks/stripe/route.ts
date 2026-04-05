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

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("[stripe webhook] signature verification failed:", err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await prisma.order.updateMany({
        where: { stripePaymentIntentId: pi.id },
        data: { paymentStatus: "FAILED" },
      });
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      if (charge.payment_intent) {
        await prisma.order.updateMany({
          where: { stripePaymentIntentId: charge.payment_intent as string },
          data: { paymentStatus: "REFUNDED", status: "REFUNDED" },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Idempotency check
  const existing = await prisma.order.findUnique({
    where: { stripeSessionId: session.id },
  });
  if (existing) return;

  const meta = session.metadata!;
  const userId = meta.userId;
  const partnerId = meta.partnerId;
  const addressId = meta.addressId || null;
  const promotionId = meta.promotionId || null;
  const items = JSON.parse(meta.items || "[]");

  const subtotal = session.amount_subtotal ?? 0;
  const total = session.amount_total ?? 0;
  const discountAmount = subtotal - total;

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId,
      partnerId,
      addressId,
      promotionId,
      status: "CONFIRMED",
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

  // Decrement stock for physical items
  for (const item of items) {
    if (item.type === "PHYSICAL") {
      await prisma.product.update({
        where: { id: item.id },
        data: { stock: { decrement: item.quantity } },
      });
    }
  }

  // Increment promo usage
  if (promotionId) {
    await prisma.promotion.update({
      where: { id: promotionId },
      data: { usageCount: { increment: 1 } },
    });
  }

  return order;
}
