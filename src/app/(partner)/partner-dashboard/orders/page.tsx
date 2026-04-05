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

export default async function PartnerOrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.partnerId) redirect("/partner-dashboard");

  const orders = await prisma.order.findMany({
    where: { partnerId: session.user.partnerId },
    include: {
      user: { select: { name: true, email: true } },
      items: { include: { product: { select: { name: true } }, service: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const statusVariant: Record<string, "green" | "red" | "yellow" | "blue" | "gray"> = {
    PENDING: "yellow", CONFIRMED: "blue", PROCESSING: "blue",
    SHIPPED: "blue", DELIVERED: "green", CANCELLED: "red", REFUNDED: "gray",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy mb-6">Orders</h1>
      {orders.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">No orders yet.</Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Order", "Customer", "Items", "Total", "Status", "Date", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">#{o.orderNumber}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <p>{o.user.name}</p>
                    <p className="text-xs text-gray-400">{o.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">
                    {o.items.map((i) => i.product?.name ?? i.service?.name).join(", ")}
                  </td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(o.total)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[o.status] ?? "gray"}>{o.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{format(new Date(o.createdAt), "d MMM yy")}</td>
                  <td className="px-4 py-3">
                    <Link href={`/partner-dashboard/orders/${o.id}`} className="text-brand-green hover:underline text-sm">Manage</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
