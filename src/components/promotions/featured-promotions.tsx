import type { Promotion } from "@prisma/client";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface FeaturedPromotionsProps {
  promotions: Promotion[];
}

export function FeaturedPromotions({ promotions }: FeaturedPromotionsProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-brand-navy">
          <span className="h-6 w-1 rounded-full bg-brand-red" />
          Featured Promotions
        </h2>

        <Link
          href="/promotions"
          className="text-sm font-medium text-brand-green hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-3">
        {promotions.map((promo) => {
          const discountText =
            promo.type === "PERCENTAGE"
              ? `${promo.discountValue}% OFF`
              : promo.type === "FIXED_AMOUNT"
              ? `${formatCurrency(promo.discountValue)} OFF`
              : "FREE SHIPPING";

          return (
            <Link
              key={promo.id}
              href="/promotions"
              className="block h-full"
            >
              <Card className="flex h-full min-h-[160px] flex-col overflow-hidden border border-cyan-100 bg-white/70 transition-all hover:-translate-y-0.5 hover:border-brand-green/40 hover:shadow-md">
                {promo.bannerUrl && (
                  <div className="relative h-24 w-full overflow-hidden bg-gray-100">
                    <Image
                      src={promo.bannerUrl}
                      alt={promo.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <Badge
                      variant="destructive"
                      className="bg-red-100 text-brand-red hover:bg-red-100"
                    >
                      {discountText}
                    </Badge>

                    <h3 className="mt-3 line-clamp-1 font-semibold text-brand-navy">
                      {promo.title}
                    </h3>

                    {promo.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                        {promo.description}
                      </p>
                    )}
                  </div>

                  {promo.code && (
                    <div className="mt-4">
                      <span className="inline-flex rounded-md bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white">
                        {promo.code}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}