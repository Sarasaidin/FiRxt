import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/utils";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error("[Stripe Webhook] Signature verification failed:", error);

    return NextResponse.json(
      { error: `Webhook Error: ${error.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(checkoutSession);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        await prisma.order.updateMany({
          where: {
            stripePaymentIntentId: paymentIntent.id,
          },
          data: {
            paymentStatus: "FAILED",
          },
        });

        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;

        if (charge.payment_intent) {
          await prisma.order.updateMany({
            where: {
              stripePaymentIntentId: charge.payment_intent as string,
            },
            data: {
              paymentStatus: "REFUNDED",
              status: "REFUNDED",
            },
          });
        }

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[Stripe Webhook] Handler failed:", error);

    return NextResponse.json(
      { error: error?.message || "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const existingOrder = await prisma.order.findUnique({
    where: {
      stripeSessionId: session.id,
    },
  });

  if (existingOrder) {
    return existingOrder;
  }

  const metadata = session.metadata ?? {};

  const userId = metadata.userId;
  const partnerId = metadata.partnerId;
  const addressId = metadata.addressId || null;
  const promotionId = metadata.promotionId || null;
  const requestedFulfillmentType = metadata.fulfillmentType;
  const rawItems = metadata.items || "[]";

  if (!userId || !partnerId) {
    throw new Error("Missing required checkout metadata: userId or partnerId");
  }

  let items: any[] = [];

  try {
    items = JSON.parse(rawItems);
  } catch {
    throw new Error("Invalid checkout items metadata");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Missing checkout items metadata");
  }

  const subtotal = session.amount_subtotal ?? 0;
  const total = session.amount_total ?? 0;
  const discountAmount = Math.max(subtotal - total, 0);

  const hasServiceItem = items.some((item) => item.type === "SERVICE");

  const finalFulfillmentType = hasServiceItem
    ? "IN_STORE_VISIT"
    : requestedFulfillmentType === "HOME_DELIVERY"
    ? "HOME_DELIVERY"
    : "IN_STORE_PICKUP";

  const orderStatus =
    finalFulfillmentType === "IN_STORE_VISIT"
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
      fulfillmentType: finalFulfillmentType,
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

  for (const item of items) {
    if (item.type === "PHYSICAL") {
      await prisma.product.update({
        where: {
          id: item.id,
        },
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
      where: {
        id: promotionId,
      },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });
  }

  return order;
}