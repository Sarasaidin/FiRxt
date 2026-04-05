import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const partner = await prisma.partner.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      products: { where: { isActive: true }, take: 20 },
      services: { where: { isActive: true }, take: 20 },
      reviews: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, image: true } } },
      },
      _count: { select: { reviews: true, products: true, services: true } },
    },
  });

  if (!partner) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ partner });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const partner = await prisma.partner.findUnique({ where: { id } });
  if (!partner) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role !== "ADMIN" && partner.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const updated = await prisma.partner.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      logoUrl: body.logoUrl,
      bannerUrl: body.bannerUrl,
      phone: body.phone,
      email: body.email,
      website: body.website,
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2,
      city: body.city,
      state: body.state,
      postcode: body.postcode,
      latitude: body.latitude,
      longitude: body.longitude,
      operatingHours: body.operatingHours,
      tags: body.tags,
    },
  });

  return NextResponse.json({ partner: updated });
}
