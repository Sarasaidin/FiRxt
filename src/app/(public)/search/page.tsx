export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { PartnerCard } from "@/components/partner/partner-card";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

interface Props {
  searchParams: Promise<{ q?: string; type?: string }>;
}

export async function generateMetadata({ searchParams }: Props) {
  const { q } = await searchParams;
  return { title: q ? `Search: ${q}` : "Search" };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, type } = await searchParams;

  const partnerWhere: any = { status: "APPROVED" };
  const itemWhere: any = { isActive: true };

  if (type) partnerWhere.type = type;
  if (q) {
    partnerWhere.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
    itemWhere.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
    ];
  }

  const [partners, products, services] = await Promise.all([
    prisma.partner.findMany({
      where: partnerWhere,
      select: {
        id: true, slug: true, name: true, type: true,
        city: true, state: true, addressLine1: true,
        logoUrl: true, isVerified: true, latitude: true, longitude: true,
      },
      take: 20,
    }),
    q
      ? prisma.product.findMany({
          where: { ...itemWhere, partner: { status: "APPROVED" } },
          select: {
            id: true, name: true, slug: true, price: true, images: true,
            partner: { select: { slug: true, name: true } },
          },
          take: 20,
        })
      : [],
    q
      ? prisma.service.findMany({
          where: { ...itemWhere, partner: { status: "APPROVED" } },
          select: {
            id: true, name: true, slug: true, price: true, images: true,
            partner: { select: { slug: true, name: true } },
          },
          take: 20,
        })
      : [],
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold text-brand-navy mb-1">
        {q ? `Results for "${q}"` : type ? `${type.replace("_", " ")}s` : "All Partners"}
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        {partners.length} partners, {products.length} products, {services.length} services found
      </p>

      {/* Partners */}
      {partners.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Partners</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partners.map((p) => <PartnerCard key={p.id} {...p} />)}
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
                  {product.images[0] ? (
                    <Image src={product.images[0]} alt={product.name} width={300} height={180} className="w-full h-36 object-cover" />
                  ) : (
                    <div className="w-full h-36 bg-gray-100 flex items-center justify-center text-gray-400">💊</div>
                  )}
                  <div className="p-3">
                    <p className="text-sm font-semibold text-brand-navy line-clamp-2">{product.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{product.partner.name}</p>
                    <p className="font-bold text-brand-green mt-1">{formatCurrency(product.price)}</p>
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
                  {service.images[0] ? (
                    <Image src={service.images[0]} alt={service.name} width={300} height={180} className="w-full h-36 object-cover" />
                  ) : (
                    <div className="w-full h-36 bg-gray-100 flex items-center justify-center text-gray-400">🏥</div>
                  )}
                  <div className="p-3">
                    <p className="text-sm font-semibold text-brand-navy line-clamp-2">{service.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{service.partner.name}</p>
                    <p className="font-bold text-brand-green mt-1">{formatCurrency(service.price)}</p>
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
          <p className="text-gray-400 text-sm mt-2">Try different keywords or browse all partners.</p>
          <Link href="/" className="mt-4 inline-block text-brand-green hover:underline text-sm">Browse all partners</Link>
        </Card>
      )}
    </div>
  );
}
