export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { PartnerCard } from "@/components/partner/partner-card";
import { HomeHero } from "@/components/home/home-hero";
import { HomeCategories } from "@/components/home/home-categories";
import { FeaturedPromotions } from "@/components/promotions/featured-promotions";

export const revalidate = 60;

export default async function HomePage() {
  const [partners, promotions] = await Promise.all([
    prisma.partner.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        slug: true,
        name: true,
        type: true,
        city: true,
        state: true,
        addressLine1: true,
        logoUrl: true,
        isVerified: true,
        latitude: true,
        longitude: true,
      },
    }),
    prisma.promotion.findMany({
      where: {
        status: "ACTIVE",
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      take: 3,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="bg-teal-gradient min-h-screen">
      <HomeHero />

      {/* Promotions */}
      {promotions.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-6">
          <FeaturedPromotions promotions={promotions} />
        </section>
      )}

      {/* Categories */}
      <HomeCategories />

      {/* Partner Grid */}
      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="w-1 h-5 bg-brand-green rounded-full" />
          <h2 className="text-base font-semibold text-gray-800">All Partners</h2>
        </div>

        {partners.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg">No partners yet.</p>
            <p className="text-sm mt-2">Be the first to partner with us!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partners.map((partner) => (
              <PartnerCard
                key={partner.id}
                {...partner}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
