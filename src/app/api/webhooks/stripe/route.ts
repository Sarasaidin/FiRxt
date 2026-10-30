
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import {
  generateOrderNumber,
  generateVisitNumber,
} from "@/lib/utils";
import { getRefundDecision } from "@/lib/payment-refund";
import { recoverPaidCheckout } from "@/lib/payment-recovery";


type VerifiedItem = {
  id: string;
  type: "PHYSICAL" | "SERVICE";
  quantity: number;
  unitPrice: number;
};

class RecoverableFulfillmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecoverableFulfillmentError";
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook signature configuration is missing" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error("[Stripe Webhook] Signature verification failed:", error);

    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        await prisma.order.updateMany({
          where: {
            stripePaymentIntentId: paymentIntent.id,
            paymentStatus: { not: "PAID" },
          },
          data: { paymentStatus: "FAILED" },
        });
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;

        if (
          typeof charge.payment_intent === "string" &&
          charge.amount > 0 &&
          charge.amount_refunded >= 0 &&
          charge.amount_refunded <= charge.amount
        ) {
          const decision = getRefundDecision(
            charge.amount,
            charge.amount_refunded
          );

          if (decision === "FULL_REFUND") {
            await prisma.order.updateMany({
              where: {
                stripePaymentIntentId: charge.payment_intent,
              },
              data: {
                paymentStatus: "REFUNDED",
                status: "REFUNDED",
              },
            });
          } else {
            console.info(
              `[Stripe Webhook] Partial refund for charge ${charge.id}; order remains unchanged.`
            );
          }
        } else {
          throw new Error(
            `Invalid refund amounts for Stripe charge ${charge.id}`
          );
        }

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Handler failed:", error);

    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
) {
  if (session.mode !== "payment" || session.payment_status !== "paid") {
    console.log(
      `[Stripe Webhook] Session ${session.id} is not a paid payment session.`
    );
    return;
  }

  if (
    session.currency !== "myr" ||
    session.amount_total === null ||
    session.amount_subtotal === null
  ) {
    throw new Error("Invalid checkout currency or amount");
  }

  const metadata = session.metadata;
  const userId = metadata?.userId;
  const partnerId = metadata?.partnerId;
  const requestedFulfillment = metadata?.fulfillmentType;
  const promotionId = metadata?.promotionId || null;

  if (!userId || !partnerId) {
    throw new Error("Missing checkout user or partner metadata");
  }

  const existingOrder = await prisma.order.findUnique({
    where: { stripeSessionId: session.id },
    select: { id: true },
  });

  if (existingOrder) {
    await ensureClinicVisit(existingOrder.id);
    return;
  }

  // Retrieve the actual line items from Stripe, not the browser cart.
  const stripeLineItems = await stripe.checkout.sessions.listLineItems(
    session.id,
    { limit: 100, expand: ["data.price.product"] }
  );

  if (stripeLineItems.has_more || stripeLineItems.data.length === 0) {
    throw new Error("Checkout line items are empty or exceed the supported limit");
  }

  const verifiedItems: VerifiedItem[] = [];

  for (const line of stripeLineItems.data) {
    const stripeProduct = line.price?.product;

    if (
      !stripeProduct ||
      typeof stripeProduct === "string" ||
      !line.price ||
      line.price.unit_amount === null ||
      line.quantity === null ||
      !Number.isSafeInteger(line.quantity) ||
      line.quantity < 1 ||
      line.currency !== "myr"
    ) {
      throw new Error("Invalid Stripe checkout line item");
    }

    // Stripe can return a DeletedProduct, which has no metadata.
    if ("deleted" in stripeProduct && stripeProduct.deleted) {
      throw new Error("Stripe checkout references a deleted product");
    }

    const itemType = stripeProduct.metadata.type;
    const itemId =
      itemType === "PHYSICAL"
        ? stripeProduct.metadata.productId
        : itemType === "SERVICE"
        ? stripeProduct.metadata.serviceId
        : undefined;

    if (
      !itemId ||
      (itemType !== "PHYSICAL" && itemType !== "SERVICE")
    ) {
      throw new Error("Missing or invalid Stripe product metadata");
    }

    if (
      !Number.isSafeInteger(line.price.unit_amount) ||
      line.price.unit_amount < 0 ||
      line.amount_subtotal !== line.price.unit_amount * line.quantity
    ) {
      throw new Error("Stripe line item amount is inconsistent");
    }

    verifiedItems.push({
      id: itemId,
      type: itemType,
      quantity: line.quantity,
      unitPrice: line.price.unit_amount,
    });
  }

  // Stripe's pre-discount line-item subtotal must match the session.
  const calculatedSubtotal = verifiedItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  if (calculatedSubtotal !== session.amount_subtotal) {
    throw new Error("Checkout subtotal does not match Stripe line items");
  }

  if (session.amount_total > session.amount_subtotal) {
    throw new Error("Unexpected checkout total");
  }

  const hasServiceItem = verifiedItems.some(
    (item) => item.type === "SERVICE"
  );

  const fulfillmentType = hasServiceItem
    ? "IN_STORE_VISIT"
    : requestedFulfillment === "HOME_DELIVERY"
    ? "HOME_DELIVERY"
    : "IN_STORE_PICKUP";

  const orderStatus =
    fulfillmentType === "IN_STORE_VISIT"
      ? "BOOKING_CONFIRMED"
      : "READY_FOR_COLLECTION";

  const discountAmount =
    session.amount_subtotal - session.amount_total;

  try {
    await prisma.$transaction(
      async (tx) => {
        // Recheck inside the transaction to reduce duplicate processing.
        const duplicate = await tx.order.findUnique({
          where: { stripeSessionId: session.id },
          select: { id: true },
        });

        if (duplicate) {
          return;
        }

        const partner = await tx.partner.findUnique({
          where: { id: partnerId },
          select: { id: true, type: true },
        });

        if (!partner) {
          throw new RecoverableFulfillmentError(
            `Checkout partner is unavailable: ${partnerId}`
          );
        }

        const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];

        for (const item of verifiedItems) {
          if (item.type === "PHYSICAL") {
            const product = await tx.product.findUnique({
              where: { id: item.id },
              select: {
                id: true,
                partnerId: true,
                isActive: true,
              },
            });

            if (
              !product ||
              !product.isActive ||
              product.partnerId !== partnerId
            ) {
              throw new RecoverableFulfillmentError(
                `Purchased product is unavailable or invalid: ${item.id}`
              );
            }

            orderItems.push({
              product: { connect: { id: product.id } },
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * item.quantity,
              itemType: "PHYSICAL",
            });
          } else {
            const service = await tx.service.findUnique({
              where: { id: item.id },
              select: {
                id: true,
                partnerId: true,
                isActive: true,
              },
            });

            if (
              !service ||
              !service.isActive ||
              service.partnerId !== partnerId
            ) {
              throw new RecoverableFulfillmentError(
                `Purchased service is unavailable or invalid: ${item.id}`
              );
            }

            orderItems.push({
              service: { connect: { id: service.id } },
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * item.quantity,
              itemType: "SERVICE",
            });
          }
        }

        // Use the promotion only if it still exists. The paid Stripe
        // session remains the authority for the amount actually charged.
        const promotion = promotionId
          ? await tx.promotion.findUnique({
              where: { id: promotionId },
              select: { id: true },
            })
          : null;

        const order = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            userId,
            partnerId,
            addressId: metadata.addressId || null,
            promotionId: promotion?.id ?? null,
            status: orderStatus,
            paymentStatus: "PAID",
            fulfillmentType,
            subtotal: session.amount_subtotal!,
            discountAmount,
            deliveryFee: 0,
            tax: 0,
            total: session.amount_total!,
            stripeSessionId: session.id,
            stripePaymentIntentId:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : null,
            items: { create: orderItems },
          },
        });

        // Conditional decrement prevents stock from going negative.
        for (const item of verifiedItems) {
          if (item.type !== "PHYSICAL") continue;

          const result = await tx.product.updateMany({
            where: {
              id: item.id,
              partnerId,
              isActive: true,
              stock: { gte: item.quantity },
            },
            data: {
              stock: { decrement: item.quantity },
            },
          });

          if (result.count !== 1) {
            throw new RecoverableFulfillmentError(
              `Insufficient stock or product unavailable: ${item.id}`
            );
          }
        }

        if (promotion) {
          await tx.promotion.update({
            where: { id: promotion.id },
            data: { usageCount: { increment: 1 } },
          });
        }

        if (
          partner.type === "CLINIC" &&
          fulfillmentType === "IN_STORE_VISIT" &&
          hasServiceItem
        ) {
          await tx.clinicVisit.upsert({
            where: { orderId: order.id },
            update: {},
            create: {
              visitNumber: generateVisitNumber(),
              orderId: order.id,
              status: "REGISTERED",
            },
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    // A concurrent Stripe retry may win the unique stripeSessionId race.
    // Confirm that an order now exists before treating the event as handled.
    const orderAfterError = await prisma.order.findUnique({
      where: { stripeSessionId: session.id },
      select: { id: true },
    });

    if (orderAfterError) {
      await ensureClinicVisit(orderAfterError.id);
      return;
    }

    if (error instanceof RecoverableFulfillmentError) {
      await recoverPaidCheckout(session, error.message);
      return;
    }

    throw error;
  }
}

async function ensureClinicVisit(orderId: string) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        partner: { select: { type: true } },
        items: { select: { itemType: true } },
      },
    });

    if (
      !order ||
      order.paymentStatus !== "PAID" ||
      order.partner.type !== "CLINIC" ||
      order.fulfillmentType !== "IN_STORE_VISIT" ||
      !order.items.some((item) => item.itemType === "SERVICE")
    ) {
      return;
    }

    await tx.clinicVisit.upsert({
      where: { orderId: order.id },
      update: {},
      create: {
        visitNumber: generateVisitNumber(),
        orderId: order.id,
        status: "REGISTERED",
      },
    });
  });
}
