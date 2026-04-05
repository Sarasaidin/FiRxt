import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      partner: { select: { id: true, slug: true, name: true, logoUrl: true } },
      category: true,
      reviews: { take: 5, include: { user: { select: { name: true, image: true } } } },
    },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = await prisma.product.findUnique({ where: { id }, include: { partner: true } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role !== "ADMIN" && product.partner.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const updated = await prisma.product.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      images: body.images,
      price: body.price ? Math.round(body.price * 100) : undefined,
      comparePrice: body.comparePrice ? Math.round(body.comparePrice * 100) : null,
      sku: body.sku,
      stock: body.stock,
      categoryId: body.categoryId,
      brand: body.brand,
      tags: body.tags,
      requiresPrescription: body.requiresPrescription,
      isActive: body.isActive,
      isFeatured: body.isFeatured,
    },
  });

  return NextResponse.json({ product: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = await prisma.product.findUnique({ where: { id }, include: { partner: true } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role !== "ADMIN" && product.partner.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.product.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
