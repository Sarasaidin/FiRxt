import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "30");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    totalOrders,
    totalRevenue,
    newUsers,
    pendingPartners,
    activePartners,
    ordersByStatus,
    recentOrders,
  ] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: since }, paymentStatus: "PAID" } }),
    prisma.order.aggregate({
      where: { createdAt: { gte: since }, paymentStatus: "PAID" },
      _sum: { total: true },
    }),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.partner.count({ where: { status: "PENDING" } }),
    prisma.partner.count({ where: { status: "APPROVED" } }),
    prisma.order.groupBy({
      by: ["status"],
      _count: true,
      where: { createdAt: { gte: since } },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: since }, paymentStatus: "PAID" },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: { select: { name: true, email: true } },
        partner: { select: { name: true } },
      },
    }),
  ]);

  return NextResponse.json({
    summary: {
      totalOrders,
      totalRevenue: totalRevenue._sum.total ?? 0,
      newUsers,
      pendingPartners,
      activePartners,
    },
    ordersByStatus,
    recentOrders,
  });
}
