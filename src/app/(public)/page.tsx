import { prisma } from "@/lib/prisma";
import { PartnerCard } from "@/components/partner/partner-card";
import { HeroSearch } from "@/components/home/home-hero";
import { HomeCategories } from "@/components/home/home-categories";
import { FeaturedPromotions } from "@/components/promotions/featured-promotions";
import { PHASE1_PARTNER_TYPES } from "@/lib/phase1";
import Link from "next/link";

export const revalidate = 60;

export default async function HomePage() {
  const [partners, promotions] = await Promise.all([
    prisma.partner.findMany({
      where: {
        status: "APPROVED",
        type: { in: PHASE1_PARTNER_TYPES as any },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
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
    <div className="min-h-screen bg-teal-gradient">
      <HeroSearch />

      {promotions.length > 0 && (
        <FeaturedPromotions promotions={promotions} />
      )}

      <HomeCategories />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-1 rounded-full bg-brand-green" />

              <h2 className="text-xl font-bold text-brand-navy">
                Clinics & Pharmacies
              </h2>
            </div>

            <p className="mt-1 text-sm text-gray-600">
              Discover verified healthcare partners near you.
            </p>
          </div>

          <Link
            href="/search"
            className="shrink-0 text-sm font-medium text-brand-green hover:underline"
          >
            View all
          </Link>
        </div>

        {partners.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white/70 px-6 py-14 text-center">
            <p className="text-lg font-semibold text-brand-navy">
              No partners yet.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Be the first to partner with FiRxt.
            </p>

            <Link
              href="/partner-register"
              className="mt-4 inline-flex rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white hover:bg-brand-green/90"
            >
              Register your business
            </Link>
          </div>
        ) : (
          <div className="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {partners.map((partner) => (
              <PartnerCard key={partner.id} {...partner} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
} ` ` 