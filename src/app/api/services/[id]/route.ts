import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const service = await prisma.service.findUnique({
    where: { id },
    include: { partner: { select: { id: true, slug: true, name: true, logoUrl: true } }, category: true },
  });
  if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ service });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = await prisma.service.findUnique({ where: { id }, include: { partner: true } });
  if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role !== "ADMIN" && service.partner.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const updated = await prisma.service.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      images: body.images,
      price: body.price ? Math.round(body.price * 100) : undefined,
      durationMinutes: body.durationMinutes,
      categoryId: body.categoryId,
      tags: body.tags,
      isActive: body.isActive,
      isFeatured: body.isFeatured,
    },
  });
  return NextResponse.json({ service: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = await prisma.service.findUnique({ where: { id }, include: { partner: true } });
  if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role !== "ADMIN" && service.partner.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.service.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
