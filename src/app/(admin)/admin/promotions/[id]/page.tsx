export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    merchant?: string;
    start?: string;
    end?: string;
  }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;

  const promotion = await prisma.promotion.findUnique({
    where: { id },
    select: { title: true },
  });

  return {
    title: promotion ? `Promotion — ${promotion.title}` : "Promotion Registrations",
  };
}

export default async function AdminPromotionDetailPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { merchant, start, end } = await searchParams;

  const promotion = await prisma.promotion.findUnique({
    where: { id },
    include: {
      partner: { select: { name: true } },
      participatingPartners: {
        include: {
          partner: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      },
    },
  });

  if (!promotion) notFound();

  const orderWhere: any = {
    promotionId: id,
  };

  if (merchant) {
    orderWhere.partnerId = merchant;
  }

  if (start || end) {
    orderWhere.createdAt = {};
    if (start) {
      orderWhere.createdAt.gte = new Date(`${start}T00:00:00`);
    }
    if (end) {
      orderWhere.createdAt.lte = new Date(`${end}T23:59:59.999`);
    }
  }

  const orders = await prisma.order.findMany({
    where: orderWhere,
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
          id: true,
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

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

  const statusVariant: Record<string, "green" | "red" | "yellow" | "gray"> = {
    ACTIVE: "green",
    DRAFT: "yellow",
    EXPIRED: "gray",
    CANCELLED: "red",
  };

  const merchantOptions =
    promotion.participatingPartners.length > 0
      ? promotion.participatingPartners.map((link) => link.partner)
      : Array.from(
          new Map(
            orders
              .filter((order) => order.partner)
              .map((order) => [order.partner.id, order.partner])
          ).values()
        );
  
  const exportUrl = `/api/admin/promotions/${id}/export?${
    new URLSearchParams({
        ...(merchant ? { merchant } : {}),
        ...(start ? { start } : {}),
        ...(end ? { end } : {}),
    }).toString()
  }`;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/promotions"
          className="text-sm text-brand-green hover:underline"
        >
          ← Back to Promotions
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">{promotion.title}</h1>

          {promotion.description && (
            <p className="mt-2 text-gray-600">{promotion.description}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span>
              {promotion.type === "PERCENTAGE"
                ? `${promotion.discountValue}% OFF`
                : promotion.type === "FREE_SHIPPING"
                ? "Free Shipping"
                : formatCurrency(promotion.discountValue)}
            </span>

            {promotion.code && (
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                {promotion.code}
              </code>
            )}

            <span>
              {format(new Date(promotion.startDate), "d MMM yyyy")} –{" "}
              {format(new Date(promotion.endDate), "d MMM yyyy")}
            </span>
          </div>
        </div>

        <Badge variant={statusVariant[promotion.status] ?? "gray"}>
          {promotion.status}
        </Badge>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Registrations / Orders</p>
          <p className="text-2xl font-bold text-brand-navy">{orders.length}</p>
        </Card>

        <Card className="p-4">
          <p className="text-sm text-gray-500">Revenue</p>
          <p className="text-2xl font-bold text-brand-navy">
            {formatCurrency(totalRevenue)}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-sm text-gray-500">Participating Merchants</p>
          <p className="text-2xl font-bold text-brand-navy">
            {promotion.participatingPartners.length}
          </p>
        </Card>
      </div>

      <Card className="mb-6 p-5">
        <h2 className="mb-3 font-bold text-brand-navy">Merchants</h2>

        {promotion.participatingPartners.length === 0 ? (
          <p className="text-sm text-gray-500">
            Platform-wide campaign or no linked merchants.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {promotion.participatingPartners.map((link) => (
              <Badge key={link.id} variant="gray">
                {link.partner.name} ({link.partner.type})
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <Card className="mb-6 p-5">
        <h2 className="mb-4 font-bold text-brand-navy">Filter Registrations</h2>

        <form className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <input type="hidden" name="id" value={id} />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Merchant
            </label>
            <select
              name="merchant"
              defaultValue={merchant ?? ""}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
            >
              <option value="">All merchants</option>
              {merchantOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              name="start"
              defaultValue={start ?? ""}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              End Date
            </label>
            <input
              type="date"
              name="end"
              defaultValue={end ?? ""}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
                type="submit"
                className="rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
                Apply Filters
            </button>

            <Link
                href={`/admin/promotions/${id}`}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
                Reset
            </Link>

            <a
                href={exportUrl}
                className="rounded-lg border border-brand-green px-4 py-2 text-sm font-medium text-brand-green hover:bg-green-50"
            >
                Export CSV
            </a>
        </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="font-bold text-brand-navy">Registrations</h2>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No registrations / orders for this promotion yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {[
                  "Customer",
                  "Merchant",
                  "Items",
                  "Status",
                  "Total",
                  "Created",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-medium text-gray-600"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-brand-navy">
                        {order.user?.name ?? "Unknown User"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.user?.email ?? "—"}
                      </p>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {order.partner?.name ?? "—"}
                  </td>

                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {order.items.map((item) => (
                        <p key={item.id} className="text-xs text-gray-600">
                          {(item.product?.name ?? item.service?.name ?? "Item")} ×{" "}
                          {item.quantity}
                        </p>
                      ))}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <Badge variant="gray">{order.status}</Badge>
                  </td>

                  <td className="px-4 py-3 font-medium">
                    {formatCurrency(order.total)}
                  </td>

                  <td className="px-4 py-3 text-xs text-gray-500">
                    {format(new Date(order.createdAt), "d MMM yyyy, h:mm a")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}