import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function csvEscape(value: unknown) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);

  const merchant = searchParams.get("merchant");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const promotion = await prisma.promotion.findUnique({
    where: { id },
    select: { title: true },
  });

  if (!promotion) {
    return NextResponse.json({ error: "Promotion not found" }, { status: 404 });
  }

  const where: any = {
    promotionId: id,
  };

  if (merchant) {
    where.partnerId = merchant;
  }

  if (start || end) {
    where.createdAt = {};
    if (start) {
      where.createdAt.gte = new Date(`${start}T00:00:00`);
    }
    if (end) {
      where.createdAt.lte = new Date(`${end}T23:59:59.999`);
    }
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      partner: {
        select: {
          name: true,
          type: true,
        },
      },
      items: {
        include: {
          product: { select: { name: true } },
          service: { select: { name: true } },
        },
      },
    },
  });

  const header = [
    "Order Number",
    "Customer Name",
    "Customer Email",
    "Merchant",
    "Merchant Type",
    "Items",
    "Order Status",
    "Payment Status",
    "Total",
    "Created At",
  ];

  const rows = orders.map((order) => [
    order.orderNumber,
    order.user?.name ?? "",
    order.user?.email ?? "",
    order.partner?.name ?? "",
    order.partner?.type ?? "",
    order.items
      .map(
        (item) =>
          `${item.product?.name ?? item.service?.name ?? "Item"} x${item.quantity}`
      )
      .join(" | "),
    order.status,
    order.paymentStatus,
    (order.total / 100).toFixed(2),
    order.createdAt.toISOString(),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");

  const safeTitle = promotion.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeTitle}-registrations.csv"`,
    },
  });
}