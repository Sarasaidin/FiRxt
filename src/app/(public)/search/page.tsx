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
  return ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][day];
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
  searchParams: Promise<{ q?: string; type?: string; openNow?: string }>;
}

export async function generateMetadata({ searchParams }: Props) {
  const { q } = await searchParams;
  return { title: q ? `Search: ${q}` : "Search" };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, type, openNow } = await searchParams;

  const allowedType =
    type && PHASE1_PARTNER_TYPES.includes(type as any) ? type : undefined;

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

  if (q) {
    partnerWhere.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];

    productWhere.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
    ];

    serviceWhere.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
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

    q
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

    q
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
      ? rawPartners.filter((partner) => isPartnerOpenNow(partner.operatingHours))
      : rawPartners;

  const pageTitle = q
    ? `Results for "${q}"`
    : allowedType === "PHARMACY"
    ? "Pharmacies"
    : allowedType === "CLINIC"
    ? "Clinics"
    : "Clinics & Pharmacies";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold text-brand-navy mb-1">{pageTitle}</h1>

      <p className="text-gray-500 text-sm mb-6">
        {partners.length} partners, {products.length} products, {services.length} services found
      </p>

    <div className="mb-6 flex flex-wrap gap-2">
      <Link
        href={`/search${
          q || openNow
            ? `?${new URLSearchParams({
                ...(q ? { q } : {}),
                ...(openNow ? { openNow } : {}),
              }).toString()}`
            : ""
        }`}
        className={`rounded-full px-3 py-1.5 text-sm border ${
          !allowedType
            ? "border-brand-green bg-brand-green text-white"
            : "border-gray-300 text-gray-600 hover:border-brand-green"
        }`}
      >
        All
      </Link>

      <Link
        href={`/search?${new URLSearchParams({
          ...(q ? { q } : {}),
          ...(openNow ? { openNow } : {}),
          type: "PHARMACY",
        }).toString()}`}
        className={`rounded-full px-3 py-1.5 text-sm border ${
          allowedType === "PHARMACY"
            ? "border-brand-green bg-brand-green text-white"
            : "border-gray-300 text-gray-600 hover:border-brand-green"
        }`}
      >
        Pharmacy
      </Link>

      <Link
        href={`/search?${new URLSearchParams({
          ...(q ? { q } : {}),
          ...(openNow ? { openNow } : {}),
          type: "CLINIC",
        }).toString()}`}
        className={`rounded-full px-3 py-1.5 text-sm border ${
          allowedType === "CLINIC"
            ? "border-brand-green bg-brand-green text-white"
            : "border-gray-300 text-gray-600 hover:border-brand-green"
        }`}
      >
        Clinic
      </Link>
    
      <Link
        href={`/search?${new URLSearchParams({
          ...(q ? { q } : {}),
          ...(allowedType ? { type: allowedType } : {}),
          openNow: openNow === "true" ? "false" : "true",
        }).toString()}`}
        className={`rounded-full px-3 py-1.5 text-sm border ${
          openNow === "true"
            ? "border-brand-green bg-brand-green text-white"
            : "border-gray-300 text-gray-600 hover:border-brand-green"
        }`}
      >
        Open Now
      </Link>

    </div>

      {/* Partners */}
      {partners.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Partners</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partners.map((p) => (
              <PartnerCard key={p.id} {...p} />
            ))}
          </div>
        </section>
      )}

      {/* Products */}
      {products.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.map((product) => (
              <Link key={product.id} href={`/partner/${product.partner.slug}`}>
                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                  {product.images?.[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      width={300}
                      height={180}
                      className="w-full h-36 object-cover"
                    />
                  ) : (
                    <div className="w-full h-36 bg-gray-100 flex items-center justify-center text-gray-400">
                      💊
                    </div>
                  )}

                  <div className="p-3">
                    <p className="text-sm font-semibold text-brand-navy line-clamp-2">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {product.partner.name}
                    </p>
                    <p className="font-bold text-brand-green mt-1">
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
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Services</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {services.map((service) => (
              <Link key={service.id} href={`/partner/${service.partner.slug}`}>
                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                  {service.images?.[0] ? (
                    <Image
                      src={service.images[0]}
                      alt={service.name}
                      width={300}
                      height={180}
                      className="w-full h-36 object-cover"
                    />
                  ) : (
                    <div className="w-full h-36 bg-gray-100 flex items-center justify-center text-gray-400">
                      🏥
                    </div>
                  )}

                  <div className="p-3">
                    <p className="text-sm font-semibold text-brand-navy line-clamp-2">
                      {service.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {service.partner.name}
                    </p>
                    <p className="font-bold text-brand-green mt-1">
                      {formatCurrency(service.price)}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {partners.length === 0 && products.length === 0 && services.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-gray-500 text-lg">No results found.</p>
          <p className="text-gray-400 text-sm mt-2">
            Try different keywords or browse all partners.
          </p>
          <Link href="/" className="mt-4 inline-block text-brand-green hover:underline text-sm">
            Browse all partners
          </Link>
        </Card>
      )}
    </div>
  );
}