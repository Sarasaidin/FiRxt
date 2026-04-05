import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { items, addressId, promoCode } = body;

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  // Validate items and build line items
  const lineItems: any[] = [];
  let partnerId: string | null = null;
  let subtotal = 0;

  for (const item of items) {
    if (item.type === "PHYSICAL") {
      const product = await prisma.product.findUnique({
        where: { id: item.id },
        include: { partner: true },
      });
      if (!product || !product.isActive) continue;
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}` },
          { status: 400 }
        );
      }
      partnerId = product.partnerId;
      lineItems.push({
        price_data: {
          currency: "myr",
          product_data: {
            name: product.name,
            images: product.images.slice(0, 1),
            metadata: { productId: product.id, type: "PHYSICAL" },
          },
          unit_amount: product.price,
        },
        quantity: item.quantity,
      });
      subtotal += product.price * item.quantity;
    } else if (item.type === "SERVICE") {
      const service = await prisma.service.findUnique({
        where: { id: item.id },
        include: { partner: true },
      });
      if (!service || !service.isActive) continue;
      partnerId = service.partnerId;
      lineItems.push({
        price_data: {
          currency: "myr",
          product_data: {
            name: service.name,
            images: service.images.slice(0, 1),
            metadata: { serviceId: service.id, type: "SERVICE" },
          },
          unit_amount: service.price,
        },
        quantity: item.quantity,
      });
      subtotal += service.price * item.quantity;
    }
  }

  if (lineItems.length === 0) {
    return NextResponse.json({ error: "No valid items" }, { status: 400 });
  }

  // Apply promo code discount
  let discounts: any[] = [];
  let promotionId: string | undefined;
  if (promoCode) {
    const promotion = await prisma.promotion.findUnique({
      where: { code: promoCode },
    });
    if (
      promotion &&
      promotion.status === "ACTIVE" &&
      new Date() >= promotion.startDate &&
      new Date() <= promotion.endDate &&
      (!promotion.usageLimit || promotion.usageCount < promotion.usageLimit) &&
      (!promotion.minOrderValue || subtotal >= promotion.minOrderValue)
    ) {
      const coupon = await stripe.coupons.create(
        promotion.type === "PERCENTAGE"
          ? {
              percent_off: promotion.discountValue,
              duration: "once",
              ...(promotion.maxDiscount ? { max_redemptions: 1 } : {}),
            }
          : {
              amount_off: promotion.discountValue,
              currency: "myr",
              duration: "once",
            }
      );
      discounts = [{ coupon: coupon.id }];
      promotionId = promotion.id;
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    discounts,
    success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/cart`,
    metadata: {
      userId: session.user.id,
      partnerId: partnerId ?? "",
      addressId: addressId ?? "",
      promotionId: promotionId ?? "",
      items: JSON.stringify(items),
    },
    payment_method_types: ["card"],
    billing_address_collection: "auto",
    phone_number_collection: { enabled: true },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
