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

export default async function PartnerPromotionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.partnerId) redirect("/partner-dashboard");

  const partnerId = session.user.partnerId;

  const promotions = await prisma.promotion.findMany({
    where: {
      OR: [
        { partnerId },
        { participatingPartners: { some: { partnerId } } },
        {
          AND: [
            { partnerId: null },
            { participatingPartners: { none: {} } },
          ],
        },
      ],
    },
    orderBy: { createdAt: "desc" },
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

  const statusVariant: Record<string, "green" | "red" | "yellow" | "gray"> = {
    ACTIVE: "green",
    DRAFT: "yellow",
    EXPIRED: "gray",
    CANCELLED: "red",
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-brand-navy">Promotions</h1>

      {promotions.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          No promotions available.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {promotions.map((p) => {
            const isPlatformWide =
              !p.partnerId && p.participatingPartners.length === 0;

            const isSelectedCampaign =
              p.participatingPartners.length > 0 &&
              p.participatingPartners.some((link) => link.partner.id === partnerId);

            return (
              <Card key={p.id} className="p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-brand-navy">{p.title}</h3>
                  <Badge variant={statusVariant[p.status] ?? "gray"}>
                    {p.status}
                  </Badge>
                </div>

                {p.description && (
                  <p className="mb-3 text-sm text-gray-600">{p.description}</p>
                )}

                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  {isPlatformWide ? (
                    <Badge variant="gray">Platform-wide</Badge>
                  ) : isSelectedCampaign ? (
                    <Badge variant="green">Selected Campaign</Badge>
                  ) : p.partner?.name ? (
                    <Badge variant="yellow">{p.partner.name}</Badge>
                  ) : null}

                  {p.participatingPartners.length > 0 && (
                    <Badge variant="gray">
                      {p.participatingPartners.length} merchant(s)
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span>
                    {p.type === "PERCENTAGE"
                      ? `${p.discountValue}% OFF`
                      : p.type === "FREE_SHIPPING"
                      ? "Free Shipping"
                      : formatCurrency(p.discountValue)}
                  </span>

                  {p.code && (
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                      {p.code}
                    </code>
                  )}
                </div>

                <p className="mt-2 text-xs text-gray-400">
                  {format(new Date(p.startDate), "d MMM")} –{" "}
                  {format(new Date(p.endDate), "d MMM yyyy")}
                </p>
                <Link
                  href={`/partner-dashboard/promotions/${p.id}`}
                  className="mt-3 inline-block text-sm text-brand-green hover:underline"
                >
                  View Registrations
              </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}