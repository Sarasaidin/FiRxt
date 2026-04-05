import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const type = searchParams.get("type"); // PHARMACY | CLINIC | etc.

  if (!q.trim() && !type) {
    return NextResponse.json({ partners: [], products: [], services: [] });
  }

  const partnerWhere: any = { status: "APPROVED" };
  const itemWhere: any = { isActive: true };

  if (type) {
    partnerWhere.type = type;
  }

  if (q) {
    partnerWhere.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { state: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
    itemWhere.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
    ];
  }

  const [partners, products, services] = await Promise.all([
    prisma.partner.findMany({
      where: partnerWhere,
      select: {
        id: true,
        slug: true,
        name: true,
        type: true,
        city: true,
        state: true,
        addressLine1: true,
        logoUrl: true,
        isVerified: true,
        latitude: true,
        longitude: true,
      },
      take: 20,
    }),
    q
      ? prisma.product.findMany({
          where: itemWhere,
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            images: true,
            partner: { select: { slug: true, name: true } },
          },
          take: 20,
        })
      : [],
    q
      ? prisma.service.findMany({
          where: itemWhere,
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            images: true,
            partner: { select: { slug: true, name: true } },
          },
          take: 20,
        })
      : [],
  ]);

  return NextResponse.json({ partners, products, services });
}
