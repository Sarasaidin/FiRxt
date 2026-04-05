export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, ShoppingBag, DollarSign, Star } from "lucide-react";

export const metadata = { title: "Partner Dashboard" };

export default async function PartnerDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.partnerId) redirect("/");

  const partnerId = session.user.partnerId;
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [partner, orders30d, productCount, serviceCount] = await Promise.all([
    prisma.partner.findUnique({
      where: { id: partnerId },
      select: { name: true, status: true, _count: { select: { reviews: true } } },
    }),
    prisma.order.findMany({
      where: { partnerId, createdAt: { gte: since30d }, paymentStatus: "PAID" },
      select: { total: true, status: true, createdAt: true },
    }),
    prisma.product.count({ where: { partnerId, isActive: true } }),
    prisma.service.count({ where: { partnerId, isActive: true } }),
  ]);

  const revenue30d = orders30d.reduce((s, o) => s + o.total, 0);

  const recentOrders = await prisma.order.findMany({
    where: { partnerId },
    include: { items: { include: { product: { select: { name: true } }, service: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy mb-6">
        Welcome, {partner?.name}
      </h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Revenue (30d)", value: formatCurrency(revenue30d), icon: DollarSign, color: "text-brand-green" },
          { label: "Orders (30d)", value: orders30d.length, icon: ShoppingBag, color: "text-brand-navy" },
          { label: "Active Products", value: productCount, icon: Package, color: "text-blue-600" },
          { label: "Reviews", value: partner?._count.reviews ?? 0, icon: Star, color: "text-yellow-500" },
        ].map((kpi) => (
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { href: "/partner-dashboard/products/new", label: "Add Product", desc: "List a new health product" },
          { href: "/partner-dashboard/services/new", label: "Add Service", desc: "List a new service" },
          { href: "/partner-dashboard/storefront", label: "Edit Storefront", desc: "Update your profile" },
        ].map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="p-4 hover:shadow-md hover:border-brand-green/30 transition-all cursor-pointer">
              <p className="font-semibold text-brand-navy">{action.label}</p>
              <p className="text-xs text-gray-500 mt-1">{action.desc}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-brand-navy">Recent Orders</h2>
          <Link href="/partner-dashboard/orders" className="text-sm text-brand-green hover:underline">View all</Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-gray-500">No orders yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentOrders.map((order) => (
              <Link key={order.id} href={`/partner-dashboard/orders/${order.id}`}>
                <div className="flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg px-2 transition-colors cursor-pointer">
                  <div>
                    <p className="text-sm font-medium">#{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">
                      {order.items.map((i) => i.product?.name ?? i.service?.name).join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      order.status === "DELIVERED" ? "bg-green-100 text-green-700" :
                      order.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {order.status}
                    </span>
                    <span className="font-medium text-sm">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
