export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";
import { DollarSign, ShoppingBag, Store, Users } from "lucide-react";

export const metadata = { title: "Admin — Dashboard" };

export default async function AdminHomePage() {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    revenue30d,
    orders30d,
    newUsers30d,
    pendingPartners,
    activePartners,
    recentOrders,
    pendingList,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { createdAt: { gte: since30d }, paymentStatus: "PAID" }, _sum: { total: true } }),
    prisma.order.count({ where: { createdAt: { gte: since30d }, paymentStatus: "PAID" } }),
    prisma.user.count({ where: { createdAt: { gte: since30d } } }),
    prisma.partner.count({ where: { status: "PENDING" } }),
    prisma.partner.count({ where: { status: "APPROVED" } }),
    prisma.order.findMany({
      where: { paymentStatus: "PAID" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        user: { select: { name: true } },
        partner: { select: { name: true } },
      },
    }),
    prisma.partner.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const kpis = [
    { label: "Revenue (30d)", value: formatCurrency(revenue30d._sum.total ?? 0), icon: DollarSign, color: "text-brand-green" },
    { label: "Orders (30d)", value: orders30d, icon: ShoppingBag, color: "text-brand-navy" },
    { label: "New Users (30d)", value: newUsers30d, icon: Users, color: "text-blue-600" },
    { label: "Active Partners", value: activePartners, icon: Store, color: "text-brand-green" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy mb-6">Dashboard</h1>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{kpi.label}</p>
                <p className="text-2xl font-bold mt-1 text-brand-navy">{kpi.value}</p>
              </div>
              <kpi.icon className={`h-8 w-8 ${kpi.color} opacity-60`} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Partners */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-brand-navy">
              Pending Partners
              {pendingPartners > 0 && (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-red text-xs text-white">
                  {pendingPartners}
                </span>
              )}
            </h2>
            <Link href="/admin/partners/pending" className="text-sm text-brand-green hover:underline">View all</Link>
          </div>
          {pendingList.length === 0 ? (
            <p className="text-sm text-gray-500">No pending registrations</p>
          ) : (
            <div className="space-y-3">
              {pendingList.map((p) => (
                <Link key={p.id} href={`/admin/partners/${p.id}`}>
                  <div className="flex items-center justify-between rounded-lg p-2 hover:bg-gray-50 cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-brand-navy">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.city}, {p.state}</p>
                    </div>
                    <Badge variant="yellow">{p.type}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-brand-navy">Recent Orders</h2>
              <Link href="/admin/orders" className="text-sm text-brand-green hover:underline">View all</Link>
            </div>
            <div className="space-y-2">
              {recentOrders.map((o) => (
                <Link key={o.id} href={`/admin/orders/${o.id}`}>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div>
                      <p className="text-sm font-medium">#{o.orderNumber}</p>
                      <p className="text-xs text-gray-500">{o.user.name} → {o.partner.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{format(new Date(o.createdAt), "d MMM")}</span>
                      <span className="font-medium text-sm">{formatCurrency(o.total)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
