export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, ShoppingBag, DollarSign, Star, Stethoscope } from "lucide-react";

export const metadata = { title: "Partner Dashboard" };

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-green-100 text-green-700";
    case "CANCELLED":
    case "REFUNDED":
      return "bg-red-100 text-red-700";
    case "PENDING_PAYMENT":
      return "bg-yellow-100 text-yellow-700";
    case "READY_FOR_COLLECTION":
    case "BOOKING_CONFIRMED":
    case "PAID":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export default async function PartnerDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.partnerId) redirect("/");

  const partnerId = session.user.partnerId;
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [partner, orders30d, productCount, serviceCount] = await Promise.all([
    prisma.partner.findUnique({
      where: { id: partnerId },
      select: {
        name: true,
        status: true,
        _count: { select: { reviews: true } },
      },
    }),
    prisma.order.findMany({
      where: {
        partnerId,
        createdAt: { gte: since30d },
        paymentStatus: "PAID",
      },
      select: {
        total: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.product.count({
      where: { partnerId, isActive: true },
    }),
    prisma.service.count({
      where: { partnerId, isActive: true },
    }),
  ]);

  const revenue30d = orders30d.reduce((sum, order) => sum + order.total, 0);

  const recentOrders = await prisma.order.findMany({
    where: { partnerId },
    include: {
      items: {
        include: {
          product: { select: { name: true } },
          service: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-brand-navy">
        Welcome, {partner?.name}
      </h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            label: "Revenue (30d)",
            value: formatCurrency(revenue30d),
            icon: DollarSign,
            color: "text-brand-green",
            href: "/partner-dashboard/orders",
            hint: "View paid orders",
          },
          {
            label: "Orders (30d)",
            value: orders30d.length,
            icon: ShoppingBag,
            color: "text-brand-navy",
            href: "/partner-dashboard/orders",
            hint: "View all orders",
          },
          {
            label: "Active Products",
            value: productCount,
            icon: Package,
            color: "text-blue-600",
            href: "/partner-dashboard/products",
            hint: "Manage products",
          },
          {
            label: "Active Services",
            value: serviceCount,
            icon: Stethoscope,
            color: "text-purple-600",
            href: "/partner-dashboard/services",
            hint: "Manage services",
          },
          {
            label: "Reviews",
            value: partner?._count.reviews ?? 0,
            icon: Star,
            color: "text-yellow-500",
            href: "/partner-dashboard/storefront",
            hint: "View storefront",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;

          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              aria-label={`${kpi.label}: ${kpi.hint}`}
            >
              <Card className="h-full cursor-pointer p-5 transition-all hover:-translate-y-0.5 hover:border-brand-green/40 hover:shadow-md">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500">{kpi.label}</p>
                    <p className="mt-2 text-2xl font-bold text-brand-navy">
                      {kpi.value}
                    </p>
                    <p className="mt-1 text-xs font-medium text-brand-green">
                      {kpi.hint} →
                    </p>
                  </div>

                  <Icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-brand-navy">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              href: "/partner-dashboard/products/new",
              label: "Add Product",
              desc: "List a new health product",
            },
            {
              href: "/partner-dashboard/services/new",
              label: "Add Service",
              desc: "List a new healthcare service",
            },
            {
              href: "/partner-dashboard/storefront",
              label: "Edit Storefront",
              desc: "Update your business profile",
            },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              aria-label={action.label}
            >
              <Card className="group h-full cursor-pointer border-dashed p-5 transition-all hover:-translate-y-0.5 hover:border-brand-green hover:bg-brand-green/5 hover:shadow-md">
                <p className="text-base font-semibold text-brand-navy group-hover:text-brand-green">
                  + {action.label}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {action.desc}
                </p>

                <p className="mt-3 text-xs font-medium text-brand-green">
                  Click here to continue →
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-brand-navy">Recent Orders</h2>
          <Link
            href="/partner-dashboard/orders"
            className="text-sm text-brand-green hover:underline"
          >
            View all
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-sm text-gray-500">No orders yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/partner-dashboard/orders/${order.id}`}
              >
                <div className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-3 transition-colors hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium">#{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">
                      {order.items
                        .map((item) => item.product?.name ?? item.service?.name)
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(
                        order.status
                      )}`}
                    >
                      {formatStatusLabel(order.status)}
                    </span>
                    <span className="text-sm font-medium">
                      {formatCurrency(order.total)}
                    </span>
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