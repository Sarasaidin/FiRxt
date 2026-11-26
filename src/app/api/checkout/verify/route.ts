
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json(
      { error: "session_id required" },
      { status: 400 }
    );
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const stripeSession =
      await stripe.checkout.sessions.retrieve(sessionId);

    // Do not expose another customer's order.
    if (stripeSession.metadata?.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Checkout session not found" },
        { status: 404 }
      );
    }

    const order = await prisma.order.findUnique({
      where: {
        stripeSessionId: sessionId,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                images: true,
              },
            },
            service: {
              select: {
                name: true,
                images: true,
              },
            },
          },
        },
        partner: {
          select: {
            name: true,
            slug: true,
          },
        },
        promotion: {
          select: {
            id: true,
            title: true,
            code: true,
            type: true,
            discountValue: true,
          },
        },
      },
    });

    // Defence in depth: confirm that the order belongs to this user.
    if (order && order.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Checkout session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: stripeSession.payment_status,
      order,
    });
  } catch (error) {
    console.error("[Checkout Verify] Failed to verify session:", error);

    return NextResponse.json(
      { error: "Unable to verify checkout session" },
      { status: 500 }
    );
  }
}
