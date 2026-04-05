export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

export const metadata = { title: "Promotions" };
export const revalidate = 60;

export default async function PromotionsPage() {
  const promotions = await prisma.promotion.findMany({
    where: {
      status: "ACTIVE",
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
    },
    include: {
      partner: { select: { name: true, slug: true, logoUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="bg-teal-gradient min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-brand-navy">Promotions & Offers</h1>
          <p className="text-gray-600 mt-1">
            Exclusive deals from verified pharmacies and clinics
          </p>
        </div>

        {promotions.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-500 text-lg">No active promotions right now.</p>
            <p className="text-gray-400 text-sm mt-2">Check back soon!</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {promotions.map((promo) => (
              <Card key={promo.id} className="overflow-hidden hover:shadow-md transition-shadow">
                {promo.bannerUrl ? (
                  <Image
                    src={promo.bannerUrl}
                    alt={promo.title}
                    width={600}
                    height={250}
                    className="w-full h-44 object-cover"
                  />
                ) : (
                  <div className="w-full h-44 bg-gradient-to-br from-brand-teal to-brand-green/30 flex items-center justify-center">
                    <span className="text-4xl">🏷️</span>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2 className="font-bold text-brand-navy">{promo.title}</h2>
                    <Badge variant="red" className="flex-shrink-0">
                      {promo.type === "PERCENTAGE"
                        ? `${promo.discountValue}% OFF`
                        : promo.type === "FIXED_AMOUNT"
                        ? `${formatCurrency(promo.discountValue)} OFF`
                        : "FREE SHIPPING"}
                    </Badge>
                  </div>

                  {promo.description && (
                    <p className="text-sm text-gray-600 mb-3">{promo.description}</p>
                  )}

                  {promo.partner && (
                    <p className="text-xs text-gray-500 mb-2">
                      By <span className="font-medium">{promo.partner.name}</span>
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    {promo.code && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Code:</span>
                        <code className="rounded bg-brand-navy px-2 py-1 text-xs font-mono text-white">
                          {promo.code}
                        </code>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 ml-auto">
                      Until {format(new Date(promo.endDate), "d MMM yyyy")}
                    </p>
                  </div>

                  {promo.minOrderValue && (
                    <p className="text-xs text-gray-400 mt-1">
                      Min. order: {formatCurrency(promo.minOrderValue)}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
