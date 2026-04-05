import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripeSession = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items"],
  });

  const order = await prisma.order.findUnique({
    where: { stripeSessionId: sessionId },
    include: {
      items: {
        include: {
          product: { select: { name: true, images: true } },
          service: { select: { name: true, images: true } },
        },
      },
      partner: { select: { name: true, slug: true } },
    },
  });

  return NextResponse.json({
    status: stripeSession.payment_status,
    order,
  });
}
