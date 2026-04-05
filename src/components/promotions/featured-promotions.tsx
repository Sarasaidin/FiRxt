import type { Promotion } from "@prisma/client";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface FeaturedPromotionsProps {
  promotions: Promotion[];
}

export function FeaturedPromotions({ promotions }: FeaturedPromotionsProps) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-brand-red rounded-full" />
          <h2 className="text-base font-semibold text-gray-800">Featured Promotions</h2>
        </div>
        <Link href="/promotions" className="text-sm text-brand-green hover:underline">
          View all
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {promotions.map((promo) => (
          <Link key={promo.id} href="/promotions">
            <div className="relative rounded-xl overflow-hidden border border-brand-teal bg-gradient-to-br from-brand-teal/30 to-white p-4 hover:shadow-md transition-all cursor-pointer">
              {promo.bannerUrl && (
                <Image
                  src={promo.bannerUrl}
                  alt={promo.title}
                  width={400}
                  height={200}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
              )}
              <Badge variant="red" className="mb-2">
                {promo.type === "PERCENTAGE"
                  ? `${promo.discountValue}% OFF`
                  : promo.type === "FIXED_AMOUNT"
                  ? `${formatCurrency(promo.discountValue)} OFF`
                  : "FREE SHIPPING"}
              </Badge>
              <h3 className="font-semibold text-brand-navy text-sm">{promo.title}</h3>
              {promo.description && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {promo.description}
                </p>
              )}
              {promo.code && (
                <div className="mt-2 inline-block rounded bg-brand-navy px-2 py-1 text-xs font-mono text-white">
                  {promo.code}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
