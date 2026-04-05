import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") !== "false";

  const where: any = {};
  if (activeOnly) {
    where.status = "ACTIVE";
    where.startDate = { lte: new Date() };
    where.endDate = { gte: new Date() };
  }

  const promotions = await prisma.promotion.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { partner: { select: { name: true, slug: true, logoUrl: true } } },
  });

  return NextResponse.json({ promotions });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "PARTNER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  let partnerId: string | null = null;
  if (session.user.role === "PARTNER") {
    const partner = await prisma.partner.findFirst({
      where: { userId: session.user.id, status: "APPROVED" },
    });
    if (!partner) return NextResponse.json({ error: "Partner not approved" }, { status: 403 });
    partnerId = partner.id;
  } else if (body.partnerId) {
    partnerId = body.partnerId;
  }

  const promotion = await prisma.promotion.create({
    data: {
      partnerId,
      title: body.title,
      description: body.description,
      bannerUrl: body.bannerUrl,
      type: body.type,
      status: "DRAFT",
      discountValue: body.discountValue,
      minOrderValue: body.minOrderValue ?? null,
      maxDiscount: body.maxDiscount ?? null,
      code: body.code ?? null,
      usageLimit: body.usageLimit ?? null,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    },
  });

  return NextResponse.json({ promotion }, { status: 201 });
}
