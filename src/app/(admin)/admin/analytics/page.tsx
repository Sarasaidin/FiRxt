export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { AdminAnalyticsCharts } from "@/components/analytics/admin-analytics-charts";

export const metadata = { title: "Admin — Analytics" };

export default async function AdminAnalyticsPage() {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [summary, topPartners, revenueData] = await Promise.all([
    Promise.all([
      prisma.order.aggregate({ where: { paymentStatus: "PAID", createdAt: { gte: since30d } }, _sum: { total: true } }),
      prisma.order.count({ where: { paymentStatus: "PAID", createdAt: { gte: since30d } } }),
      prisma.user.count({ where: { createdAt: { gte: since30d } } }),
      prisma.partner.count({ where: { status: "PENDING" } }),
    ]),
    prisma.partner.findMany({
      where: { status: "APPROVED" },
      select: {
        id: true,
        name: true,
        _count: { select: { orders: true } },
        orders: { where: { paymentStatus: "PAID" }, select: { total: true } },
      },
      take: 10,
    }),
    // Daily revenue last 30 days
    prisma.$queryRaw<{ date: Date; revenue: bigint; count: bigint }[]>`
      SELECT
        DATE(created_at) as date,
        SUM(total) as revenue,
        COUNT(*) as count
      FROM orders
      WHERE payment_status = 'PAID'
        AND created_at >= ${since30d}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `,
  ]);

  const [revAgg, orderCount, newUsers, pendingPartners] = summary;

  const topPartnersRanked = topPartners
    .map((p) => ({
      name: p.name,
      orders: p._count.orders,
      revenue: p.orders.reduce((s, o) => s + o.total, 0),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const chartData = (revenueData as any[]).map((d) => ({
    date: d.date instanceof Date ? d.date.toISOString().slice(0, 10) : String(d.date),
    revenue: Number(d.revenue),
    orders: Number(d.count),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy mb-6">Analytics</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Revenue (30d)", value: formatCurrency(revAgg._sum.total ?? 0) },
          { label: "Orders (30d)", value: orderCount },
          { label: "New Users (30d)", value: newUsers },
          { label: "Pending Partners", value: pendingPartners },
        ].map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className="text-xl font-bold text-brand-navy mt-1">{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Charts (client component) */}
      <AdminAnalyticsCharts chartData={chartData} />

      {/* Top Partners */}
      <Card className="p-5 mt-6">
        <h2 className="font-bold text-brand-navy mb-4">Top Partners by Revenue</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 text-gray-600 font-medium">Partner</th>
              <th className="text-right py-2 text-gray-600 font-medium">Orders</th>
              <th className="text-right py-2 text-gray-600 font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {topPartnersRanked.map((p, i) => (
              <tr key={p.name}>
                <td className="py-2.5">
                  <span className="text-gray-400 mr-2">#{i + 1}</span>
                  <span className="font-medium text-brand-navy">{p.name}</span>
                </td>
                <td className="py-2.5 text-right text-gray-600">{p.orders}</td>
                <td className="py-2.5 text-right font-bold text-brand-green">{formatCurrency(p.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
