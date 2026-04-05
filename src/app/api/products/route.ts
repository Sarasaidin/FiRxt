import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const partnerId = searchParams.get("partnerId");
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("q");
  const featured = searchParams.get("featured") === "true";

  const where: any = { isActive: true };
  if (partnerId) where.partnerId = partnerId;
  if (categoryId) where.categoryId = categoryId;
  if (featured) where.isFeatured = true;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
      { tags: { has: search } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      partner: { select: { slug: true, name: true } },
      category: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ products });
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
  while (await prisma.product.findUnique({ where: { partnerId_slug: { partnerId, slug } } })) {
    slug = `${baseSlug}-${i++}`;
  }

  const product = await prisma.product.create({
    data: {
      partnerId,
      categoryId: body.categoryId ?? null,
      name: body.name,
      slug,
      description: body.description,
      images: body.images ?? [],
      price: Math.round(body.price * 100),
      comparePrice: body.comparePrice ? Math.round(body.comparePrice * 100) : null,
      sku: body.sku,
      stock: body.stock ?? 0,
      brand: body.brand,
      tags: body.tags ?? [],
      requiresPrescription: body.requiresPrescription ?? false,
      isActive: body.isActive ?? true,
      isFeatured: body.isFeatured ?? false,
    },
  });

  return NextResponse.json({ product }, { status: 201 });
}
