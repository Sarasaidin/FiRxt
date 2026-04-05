import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    // Return featured products for anonymous users
    const featured = await prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      take: 8,
      include: { partner: { select: { slug: true, name: true } } },
    });
    return NextResponse.json({ products: featured });
  }

  // Get user's purchased categories
  const purchasedItems = await prisma.orderItem.findMany({
    where: { order: { userId: session.user.id }, productId: { not: null } },
    include: { product: { select: { categoryId: true } } },
    take: 20,
  });

  const categoryIds = [
    ...new Set(
      purchasedItems
        .map((item) => item.product?.categoryId)
        .filter(Boolean) as string[]
    ),
  ];

  let products;
  if (categoryIds.length > 0) {
    products = await prisma.product.findMany({
      where: {
        isActive: true,
        categoryId: { in: categoryIds },
        orderItems: { none: { order: { userId: session.user.id } } },
      },
      take: 8,
      include: { partner: { select: { slug: true, name: true } } },
    });
  } else {
    products = await prisma.product.findMany({
      where: { isActive: true },
      take: 8,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      include: { partner: { select: { slug: true, name: true } } },
    });
  }

  return NextResponse.json({ products });
}
