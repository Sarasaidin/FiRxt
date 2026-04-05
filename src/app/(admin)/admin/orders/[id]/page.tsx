export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";

interface Props { params: Promise<{ id: string }> }

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { name: true } }, service: { select: { name: true } } } },
      user: { select: { name: true, email: true, phone: true } },
      partner: { select: { name: true, slug: true, phone: true } },
      address: true,
      history: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) notFound();

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin/orders" className="text-sm text-gray-500 hover:text-brand-green">Orders</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium">#{order.orderNumber}</span>
      </div>

      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-brand-navy">#{order.orderNumber}</h1>
              <p className="text-sm text-gray-500">{format(new Date(order.createdAt), "d MMM yyyy, h:mm a")}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant={order.paymentStatus === "PAID" ? "green" : "red"}>{order.paymentStatus}</Badge>
              <Badge variant="blue">{order.status}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="font-medium text-gray-700">Customer</p>
              <p>{order.user.name}</p>
              <p className="text-gray-500 text-xs">{order.user.email}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Partner</p>
              <p>{order.partner.name}</p>
              {order.partner.phone && <p className="text-gray-500 text-xs">{order.partner.phone}</p>}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.product?.name ?? item.service?.name} × {item.quantity}</span>
                <span className="font-medium">{formatCurrency(item.totalPrice)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2 border-t border-gray-100">
              <span>Total</span>
              <span className="text-brand-green">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </Card>

        {order.stripePaymentIntentId && (
          <Card className="p-4">
            <p className="text-sm font-medium text-gray-700">Stripe Payment Intent</p>
            <code className="text-xs text-gray-500">{order.stripePaymentIntentId}</code>
          </Card>
        )}
      </div>
    </div>
  );
}
