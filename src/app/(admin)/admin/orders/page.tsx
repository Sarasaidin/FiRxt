export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";

export const metadata = { title: "Admin — Orders" };

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
      partner: { select: { name: true } },
    },
  });

  const statusVariant: Record<string, "green" | "red" | "yellow" | "blue" | "gray"> = {
    PENDING: "yellow", CONFIRMED: "blue", PROCESSING: "blue",
    SHIPPED: "blue", DELIVERED: "green", CANCELLED: "red", REFUNDED: "gray",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy mb-6">All Orders</h1>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Order", "Customer", "Partner", "Total", "Payment", "Status", "Date", ""].map((h) => (
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
                <td className="px-4 py-3 text-gray-600">{o.partner.name}</td>
                <td className="px-4 py-3 font-medium">{formatCurrency(o.total)}</td>
                <td className="px-4 py-3">
                  <Badge variant={o.paymentStatus === "PAID" ? "green" : o.paymentStatus === "FAILED" ? "red" : "yellow"}>
                    {o.paymentStatus}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant[o.status] ?? "gray"}>{o.status}</Badge>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(o.createdAt), "d MMM yy")}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="text-brand-green hover:underline">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <p className="p-8 text-center text-gray-500">No orders yet.</p>}
      </Card>
    </div>
  );
}
