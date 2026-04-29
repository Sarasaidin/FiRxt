export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarDays, Store, TicketPercent } from "lucide-react";

export const metadata = { title: "Promotions" };
export const revalidate = 60;

function getDiscountText(type: string, value: number) {
  if (type === "PERCENTAGE") {
    return `${value}% OFF`;
  }

  if (type === "FIXED_AMOUNT") {
    return `${formatCurrency(value)} OFF`;
  }

  return "FREE SHIPPING";
}

export default async function PromotionsPage() {
  const promotions = await prisma.promotion.findMany({
    where: {
      status: "ACTIVE",
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
    },
    include: {
      partner: {
        select: {
          name: true,
          slug: true,
          logoUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-teal-gradient">
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-8 rounded-2xl border border-cyan-100 bg-white/80 p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-green">
                FiRxt Deals
              </p>

              <h1 className="mt-1 text-3xl font-bold text-brand-navy md:text-4xl">
                Promotions & Offers
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
                Save more with exclusive deals from verified clinics and
                pharmacies.
              </p>
            </div>

            <div className="rounded-xl bg-brand-green/10 px-4 py-3 text-sm font-medium text-brand-green">
              {promotions.length} active promotion
              {promotions.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        {promotions.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-green/10 text-2xl">
              🎁
            </div>

            <h2 className="mt-4 text-xl font-bold text-brand-navy">
              No active promotions right now
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Check back soon for new offers from our healthcare partners.
            </p>

            <Link
              href="/search"
              className="mt-5 inline-flex rounded-lg bg-brand-green px-5 py-2 text-sm font-medium text-white hover:bg-brand-green/90"
            >
              Browse clinics & pharmacies
            </Link>
          </Card>
        ) : (
          <div className="grid auto-rows-fr grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {promotions.map((promo) => {
              const discountText = getDiscountText(
                promo.type,
                promo.discountValue
              );

              const partnerHref = promo.partner
                ? `/partner/${promo.partner.slug}`
                : "/search";

              return (
                <Card
                  key={promo.id}
                  className="group flex h-full min-h-[360px] flex-col overflow-hidden border border-cyan-100 bg-white/80 transition-all hover:-translate-y-0.5 hover:border-brand-green/40 hover:shadow-md"
                >
                  <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-brand-teal/30 to-white">
                    {promo.bannerUrl ? (
                      <Image
                        src={promo.bannerUrl}
                        alt={promo.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <TicketPercent className="h-12 w-12 text-brand-green" />
                      </div>
                    )}

                    <Badge className="absolute left-4 top-4 bg-red-100 text-brand-red hover:bg-red-100">
                      {discountText}
                    </Badge>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="line-clamp-2 text-lg font-bold text-brand-navy">
                      {promo.title}
                    </h2>

                    {promo.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                        {promo.description}
                      </p>
                    )}

                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                      {promo.partner && (
                        <Link
                          href={partnerHref}
                          className="flex items-center gap-2 hover:text-brand-green"
                        >
                          <Store className="h-4 w-4 text-brand-green" />
                          <span className="line-clamp-1">
                            {promo.partner.name}
                          </span>
                        </Link>
                      )}

                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-brand-green" />
                        <span>
                          Valid until{" "}
                          {format(new Date(promo.endDate), "d MMM yyyy")}
                        </span>
                      </div>
                    </div>

                    {promo.minOrderValue !== null && (
                      <p className="mt-3 text-xs text-gray-500">
                        Minimum order:{" "}
                        <span className="font-semibold text-brand-navy">
                          {formatCurrency(promo.minOrderValue)}
                        </span>
                      </p>
                    )}

                    <div className="mt-auto pt-5">
                      {promo.code ? (
                        <div className="rounded-xl border border-dashed border-brand-green/40 bg-brand-green/5 p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Voucher code
                          </p>

                          <div className="mt-2 flex items-center justify-between gap-3">
                            <code className="rounded-lg bg-brand-navy px-3 py-2 text-sm font-bold text-white">
                              {promo.code}
                            </code>

                            <span className="text-xs font-medium text-brand-green">
                              Use at checkout
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-brand-green/20 bg-brand-green/5 p-4 text-sm font-medium text-brand-green">
                          Discount applies automatically when eligible.
                        </div>
                      )}

                      <Link
                        href={partnerHref}
                        className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white hover:bg-brand-green/90"
                      >
                        Browse eligible items
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}