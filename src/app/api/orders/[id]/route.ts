import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPartnerContext } from "@/lib/active-partner";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: { select: { name: true, images: true, price: true } },
          service: { select: { name: true, price: true } },
        },
      },
      partner: { select: { name: true, slug: true, phone: true } },
      address: true,
      history: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Access control
  if (session.user.role === "ADMIN") {
    // Admin can access all orders.
  } else if (session.user.role === "PARTNER") {
    const partnerContext = await getPartnerContext();
    const activePartner = partnerContext?.activePartner;

    if (
      !activePartner ||
      activePartner.status !== "APPROVED" ||
      order.partnerId !== activePartner.id
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }
  } else if (session.user.role === "CUSTOMER") {
    if (order.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }
  } else {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  return NextResponse.json({ order });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "ADMIN") {
    // Admin can update all orders.
  } else if (session.user.role === "PARTNER") {
    const partnerContext = await getPartnerContext();
    const activePartner = partnerContext?.activePartner;

    if (
      !activePartner ||
      activePartner.status !== "APPROVED" ||
      order.partnerId !== activePartner.id
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }
  } else {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: body.status,
      history: {
        create: {
          status: body.status,
          note: body.note,
          createdBy: session.user.id,
        },
      },
    },
  });

  return NextResponse.json({ order: updated });
}
