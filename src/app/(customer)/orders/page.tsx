export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "My Orders" };

const statusVariant: Record<string, "green" | "red" | "yellow" | "blue" | "gray"> = {
  PENDING: "yellow",
  CONFIRMED: "blue",
  PROCESSING: "blue",
  SHIPPED: "blue",
  DELIVERED: "green",
  CANCELLED: "red",
  REFUNDED: "gray",
};

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=/orders");

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: {
      items: { include: { product: { select: { name: true } }, service: { select: { name: true } } } },
      partner: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-brand-navy mb-6">My Orders</h1>

      {orders.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">
          <p>No orders yet.</p>
          <Link href="/" className="mt-3 inline-block text-brand-green hover:underline text-sm">
            Start shopping
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-brand-navy text-sm">#{order.orderNumber}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{order.partner.name}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(order.createdAt), "d MMM yyyy, h:mm a")}
                    </p>
                    <div className="mt-2 text-xs text-gray-600">
                      {order.items.map((item) => (
                        <span key={item.id} className="mr-2">
                          {item.product?.name ?? item.service?.name} ×{item.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={statusVariant[order.status] ?? "gray"}>
                      {order.status}
                    </Badge>
                    <span className="font-bold text-brand-green">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
