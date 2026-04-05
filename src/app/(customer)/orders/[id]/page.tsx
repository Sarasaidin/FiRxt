export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

interface Props { params: Promise<{ id: string }> }

export default async function OrderDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: { select: { name: true, images: true } },
          service: { select: { name: true } },
        },
      },
      partner: { select: { name: true, slug: true, phone: true } },
      address: true,
      history: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) notFound();

  if (
    session.user.role !== "ADMIN" &&
    order.userId !== session.user.id &&
    order.partnerId !== session.user.partnerId
  ) {
    redirect("/orders");
  }

  const statusColors: Record<string, string> = {
    PENDING: "yellow", CONFIRMED: "blue", PROCESSING: "blue",
    SHIPPED: "blue", DELIVERED: "green", CANCELLED: "red", REFUNDED: "gray",
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/orders" className="text-sm text-gray-500 hover:text-brand-green">Orders</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium">#{order.orderNumber}</span>
      </div>

      <Card className="p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-brand-navy">Order #{order.orderNumber}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Placed {format(new Date(order.createdAt), "d MMM yyyy, h:mm a")}
            </p>
          </div>
          <Badge variant={(statusColors[order.status] as any) ?? "gray"}>
            {order.status}
          </Badge>
        </div>

        <div className="border-t border-gray-100 pt-4 mb-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Items from {order.partner.name}</p>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{item.product?.name ?? item.service?.name}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                </div>
                <span className="font-medium text-sm">{formatCurrency(item.totalPrice)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-brand-green">
              <span>Discount</span><span>-{formatCurrency(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-brand-navy pt-2 border-t border-gray-100 mt-2">
            <span>Total</span><span>{formatCurrency(order.total)}</span>
          </div>
        </div>
      </Card>

      {/* Status timeline */}
      {order.history.length > 0 && (
        <Card className="p-6">
          <h2 className="font-bold text-brand-navy mb-4">Status History</h2>
          <div className="space-y-3">
            {order.history.map((h) => (
              <div key={h.id} className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-brand-green mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{h.status}</p>
                  {h.note && <p className="text-xs text-gray-500">{h.note}</p>}
                  <p className="text-xs text-gray-400">{format(new Date(h.createdAt), "d MMM yyyy, h:mm a")}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
