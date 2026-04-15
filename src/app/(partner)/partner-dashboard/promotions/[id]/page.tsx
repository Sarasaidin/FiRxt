export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;

  const promotion = await prisma.promotion.findUnique({
    where: { id },
    select: { title: true },
  });

  return {
    title: promotion
      ? `Partner Promotion — ${promotion.title}`
      : "Partner Promotion Registrations",
  };
}

export default async function PartnerPromotionDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.partnerId) redirect("/partner-dashboard");

  const partnerId = session.user.partnerId;
  const { id } = await params;

  const promotion = await prisma.promotion.findFirst({
    where: {
      id,
      OR: [
        { partnerId },
        { participatingPartners: { some: { partnerId } } },
        {
          AND: [{ partnerId: null }, { participatingPartners: { none: {} } }],
        },
      ],
    },
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

  const orders = await prisma.order.findMany({
    where: {
      promotionId: id,
      partnerId,
    },
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

  const isPlatformWide =
    !promotion.partnerId && promotion.participatingPartners.length === 0;

  const isSelectedCampaign =
    promotion.participatingPartners.length > 0 &&
    promotion.participatingPartners.some((link) => link.partner.id === partnerId);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/partner-dashboard/promotions"
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

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {isPlatformWide ? (
              <Badge variant="gray">Platform-wide</Badge>
            ) : isSelectedCampaign ? (
              <Badge variant="green">Selected Campaign</Badge>
            ) : promotion.partner?.name ? (
              <Badge variant="yellow">{promotion.partner.name}</Badge>
            ) : null}

            {promotion.participatingPartners.length > 0 && (
              <Badge variant="gray">
                {promotion.participatingPartners.length} merchant(s)
              </Badge>
            )}
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
          <p className="text-sm text-gray-500">Your Merchant</p>
          <p className="text-base font-bold text-brand-navy">
            {orders[0]?.partner?.name ??
              promotion.participatingPartners.find((link) => link.partner.id === partnerId)
                ?.partner.name ??
              promotion.partner?.name ??
              "Current Merchant"}
          </p>
        </Card>
      </div>

      <Card className="mb-6 p-5">
        <h2 className="mb-3 font-bold text-brand-navy">Campaign Scope</h2>

        {promotion.participatingPartners.length === 0 ? (
          <p className="text-sm text-gray-500">
            This promotion is platform-wide or not linked to specific merchants.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {promotion.participatingPartners.map((link) => (
              <Badge
                key={link.id}
                variant={link.partner.id === partnerId ? "green" : "gray"}
              >
                {link.partner.name} ({link.partner.type})
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="font-bold text-brand-navy">Registrations</h2>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No registrations / orders for this promotion yet for your merchant.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {[
                  "Customer",
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