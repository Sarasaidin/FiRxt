import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const partnerId = searchParams.get("partnerId");
  const search = searchParams.get("q");

  const where: any = { isActive: true };
  if (partnerId) where.partnerId = partnerId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { tags: { has: search } },
    ];
  }

  const services = await prisma.service.findMany({
    where,
    include: { partner: { select: { slug: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ services });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const partner = await prisma.partner.findFirst({
    where: { userId: session.user.id, status: "APPROVED" },
  });
  if (!partner && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Partner not approved" }, { status: 403 });
  }

  const body = await req.json();
  const partnerId = body.partnerId ?? partner?.id;
  if (!partnerId) return NextResponse.json({ error: "partnerId required" }, { status: 400 });

  const baseSlug = slugify(body.name);
  let slug = baseSlug;
  let i = 1;
  while (await prisma.service.findUnique({ where: { partnerId_slug: { partnerId, slug } } })) {
    slug = `${baseSlug}-${i++}`;
  }

  const service = await prisma.service.create({
    data: {
      partnerId,
      categoryId: body.categoryId ?? null,
      name: body.name,
      slug,
      description: body.description,
      images: body.images ?? [],
      price: Math.round(body.price * 100),
      durationMinutes: body.durationMinutes ?? null,
      tags: body.tags ?? [],
      isActive: body.isActive ?? true,
      isFeatured: body.isFeatured ?? false,
    },
  });

  return NextResponse.json({ service }, { status: 201 });
}
