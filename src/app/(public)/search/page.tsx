export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { PartnerCard } from "@/components/partner/partner-card";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { PHASE1_PARTNER_TYPES } from "@/lib/phase1";

function getTodayKey() {
  const day = new Date().getDay();

  return [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ][day];
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function isPartnerOpenNow(operatingHours: any) {
  if (!operatingHours || typeof operatingHours !== "object") return false;

  const todayKey = getTodayKey();
  const todayHours = operatingHours[todayKey];

  if (!todayHours || todayHours.closed) return false;
  if (!todayHours.open || !todayHours.close) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = toMinutes(todayHours.open);
  const closeMinutes = toMinutes(todayHours.close);

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

interface Props {
  searchParams: Promise<{
    q?: string;
    type?: string;
    openNow?: string;
  }>;
}

export async function generateMetadata({ searchParams }: Props) {
  const { q } = await searchParams;

  return {
    title: q ? `Search: ${q}` : "Search",
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, type, openNow } = await searchParams;

  const searchQuery = q?.trim();
  const normalizedQuery = searchQuery?.toLowerCase();

  const allowedType =
    type && PHASE1_PARTNER_TYPES.includes(type as any) ? type : undefined;

  const hasActiveFilter = Boolean(searchQuery || allowedType || openNow === "true");

  const partnerWhere: any = {
    status: "APPROVED",
    type: { in: PHASE1_PARTNER_TYPES as any },
  };

  const productWhere: any = {
    isActive: true,
  };

  const serviceWhere: any = {
    isActive: true,
  };

  if (allowedType) {
    partnerWhere.type = allowedType;
  }

  if (searchQuery) {
    partnerWhere.OR = [
      { name: { contains: searchQuery, mode: "insensitive" } },
      { city: { contains: searchQuery, mode: "insensitive" } },
      { description: { contains: searchQuery, mode: "insensitive" } },
    ];

    productWhere.OR = [
      { name: { contains: searchQuery, mode: "insensitive" } },
      { description: { contains: searchQuery, mode: "insensitive" } },
      { brand: { contains: searchQuery, mode: "insensitive" } },
    ];

    serviceWhere.OR = [
      { name: { contains: searchQuery, mode: "insensitive" } },
      { description: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  const [rawPartners, products, services] = await Promise.all([
    prisma.partner.findMany({
      where: partnerWhere,
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
        operatingHours: true,
      },
      take: 20,
    }),

    searchQuery
      ? prisma.product.findMany({
          where: {
            ...productWhere,
            partner: {
              status: "APPROVED",
              type: allowedType
                ? allowedType
                : { in: PHASE1_PARTNER_TYPES as any },
            },
          },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            images: true,
            partner: {
              select: {
                slug: true,
                name: true,
              },
            },
          },
          take: 20,
        })
      : [],

    searchQuery
      ? prisma.service.findMany({
          where: {
            ...serviceWhere,
            partner: {
              status: "APPROVED",
              type: allowedType
                ? allowedType
                : { in: PHASE1_PARTNER_TYPES as any },
            },
          },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            images: true,
            partner: {
              select: {
                slug: true,
                name: true,
              },
            },
          },
          take: 20,
        })
      : [],
  ]);

  const partners =
    openNow === "true"
      ? rawPartners.filter((partner) =>
          isPartnerOpenNow(partner.operatingHours)
        )
      : rawPartners;

  const pageTitle = searchQuery
    ? `Results for "${searchQuery}"`
    : openNow === "true"
    ? "Open Now"
    : allowedType === "PHARMACY"
    ? "Pharmacies"
    : allowedType === "CLINIC"
    ? "Clinics"
    : "Clinics & Pharmacies";

  const filterTabs = [
    {
      label: "All",
      href: "/search",
      active: !searchQuery && !allowedType && openNow !== "true",
    },
    {
      label: "Pharmacies",
      href: "/search?type=PHARMACY",
      active: allowedType === "PHARMACY",
    },
    {
      label: "Clinics",
      href: "/search?type=CLINIC",
      active: allowedType === "CLINIC",
    },
    {
      label: "Blood Tests",
      href: "/search?q=blood%20test",
      active: normalizedQuery === "blood test",
    },
    {
      label: "Vaccinations",
      href: "/search?q=vaccination",
      active: normalizedQuery === "vaccination",
    },
    {
      label: "Health Screening",
      href: "/search?q=health%20screening",
      active: normalizedQuery === "health screening",
    },
    {
      label: "Open Now",
      href: "/search?openNow=true",
      active: openNow === "true",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand-navy">
              {pageTitle}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-sm text-gray-500">
                {partners.length} partners, {products.length} products,{" "}
                {services.length} services found
              </p>

              {hasActiveFilter && (
                <Link
                  href="/search"
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition-all hover:border-brand-green hover:text-brand-green"
                >
                  Clear filters
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <div className="flex min-w-max gap-2">
            {filterTabs.map((tab) => (
              <Link
                key={tab.label}
                href={tab.href}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                  tab.active
                    ? "border-brand-green bg-brand-green text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-600 hover:border-brand-green hover:text-brand-green"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Partners */}
      {partners.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            Partners
          </h2>

          <div className="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {partners.map((partner) => (
              <PartnerCard key={partner.id} {...partner} />
            ))}
          </div>
        </section>
      )}

      {/* Products */}
      {products.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            Products
          </h2>

          <div className="grid auto-rows-fr grid-cols-2 gap-4 md:grid-cols-4">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/partner/${product.partner.slug}`}
                className="block h-full"
              >
                <Card className="group flex h-full min-h-[270px] flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:border-brand-green/40 hover:shadow-md">
                  <div className="relative h-36 w-full overflow-hidden bg-gray-100">
                    {product.images?.[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl text-gray-400">
                        💊
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <p className="line-clamp-2 text-sm font-semibold text-brand-navy group-hover:text-brand-green">
                      {product.name}
                    </p>

                    <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                      {product.partner.name}
                    </p>

                    <p className="mt-auto pt-4 text-base font-bold text-brand-green">
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Services */}
      {services.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            Services
          </h2>

          <div className="grid auto-rows-fr grid-cols-2 gap-4 md:grid-cols-4">
            {services.map((service) => (
              <Link
                key={service.id}
                href={`/partner/${service.partner.slug}`}
                className="block h-full"
              >
                <Card className="group flex h-full min-h-[270px] flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:border-brand-green/40 hover:shadow-md">
                  <div className="relative h-36 w-full overflow-hidden bg-gray-100">
                    {service.images?.[0] ? (
                      <Image
                        src={service.images[0]}
                        alt={service.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl text-gray-400">
                        🏥
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <p className="line-clamp-2 text-sm font-semibold text-brand-navy group-hover:text-brand-green">
                      {service.name}
                    </p>

                    <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                      {service.partner.name}
                    </p>

                    <p className="mt-auto pt-4 text-base font-bold text-brand-green">
                      {formatCurrency(service.price)}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {partners.length === 0 &&
        products.length === 0 &&
        services.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-lg text-gray-500">No results found.</p>

            <p className="mt-2 text-sm text-gray-400">
              Try different keywords or browse all partners.
            </p>

            <Link
              href="/"
              className="mt-4 inline-block text-sm text-brand-green hover:underline"
            >
              Browse all partners
            </Link>
          </Card>
        )}
    </div>
  );
}