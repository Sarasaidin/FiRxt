import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { AddToCartButton } from "@/app/components/cart/add-to-cart-button";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PartnerStorefrontPage({ params }: Props) {
  const { slug } = await params;

  const partner = await prisma.partner.findUnique({
    where: { slug },
    include: {
      products: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      },
      services: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      },
      promotions: {
        where: {
          status: "ACTIVE",
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!partner) notFound();

  const typeLabel = partner.type === "PHARMACY" ? "Pharmacy" : "Clinic";

  return (
    <div>
      {/* Banner */}
      <div className="relative h-48 bg-gradient-to-r from-brand-navy to-brand-green">
        {partner.bannerUrl && (
          <Image
            src={partner.bannerUrl}
            alt={partner.name}
            fill
            className="object-cover opacity-30"
          />
        )}
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-10">
        {/* Profile card */}
        <Card className="relative z-10 -mt-16 mb-6 p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <div className="relative h-24 w-24 overflow-hidden rounded-xl border bg-white">
              {partner.logoUrl ? (
                <Image
                  src={partner.logoUrl}
                  alt={partner.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl">
                  {partner.type === "PHARMACY" ? "💊" : "🏥"}
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-brand-navy">
                  {partner.name}
                </h1>

                {partner.isVerified && (
                  <span className="rounded-full bg-brand-green/10 px-2 py-1 text-xs font-medium text-brand-green">
                    Verified
                  </span>
                )}

                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                  {typeLabel}
                </span>
              </div>

              {partner.description && (
                <p className="mb-4 text-gray-600">{partner.description}</p>
              )}

              <div className="space-y-1 text-sm text-gray-600">
                <p>
                  {partner.addressLine1}, {partner.city}, {partner.state}
                </p>

                {partner.phone && <p>{partner.phone}</p>}

                {partner.website && (
                  <p>
                    <a
                      href={partner.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-green hover:underline"
                    >
                      {partner.website}
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="mb-6 p-4">
          <p className="text-sm text-gray-700">
            {partner.type === "PHARMACY"
              ? "Reserve and pay online, then collect your items in store."
              : "Reserve and pay online, then attend your appointment at the clinic."}
          </p>
        </Card>

        {/* Promotions */}
        {partner.promotions.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-gray-800">
              Promotions
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {partner.promotions.map((promo) => (
                <Card key={promo.id} className="p-4">
                  <h3 className="font-semibold text-brand-navy">
                    {promo.title}
                  </h3>
                  {promo.description && (
                    <p className="mt-1 text-sm text-gray-600">
                      {promo.description}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Products & Services */}
        <div className="grid gap-10 lg:grid-cols-2">
          {/* Products */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              Products
            </h2>

            {partner.products.length === 0 ? (
              <Card className="p-6 text-center text-sm text-gray-500">
                No products available yet.
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {partner.products.map((product) => (
                  <Card
                    key={product.id}
                    className="overflow-hidden transition-shadow hover:shadow-md"
                  >
                    {product.images?.[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        width={500}
                        height={240}
                        className="h-40 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-40 w-full items-center justify-center bg-gray-100 text-4xl">
                        💊
                      </div>
                    )}

                    <div className="p-4">
                      <h3 className="line-clamp-2 font-semibold text-brand-navy">
                        {product.name}
                      </h3>

                      {product.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                          {product.description}
                        </p>
                      )}

                      <p className="mt-2 font-bold text-brand-green">
                        {formatCurrency(product.price)}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Stock: {product.stock}
                      </p>

                      <AddToCartButton
                        id={product.id}
                        name={product.name}
                        price={product.price}
                        type="PHYSICAL"
                        image={product.images?.[0]}
                        partnerId={partner.id}
                        partnerName={partner.name}
                        partnerSlug={partner.slug}
                        stock={product.stock}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Services */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              Services
            </h2>

            {partner.services.length === 0 ? (
              <Card className="p-6 text-center text-sm text-gray-500">
                No services available yet.
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {partner.services.map((service) => (
                  <Card
                    key={service.id}
                    className="overflow-hidden transition-shadow hover:shadow-md"
                  >
                    {service.images?.[0] ? (
                      <Image
                        src={service.images[0]}
                        alt={service.name}
                        width={500}
                        height={240}
                        className="h-40 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-40 w-full items-center justify-center bg-gray-100 text-4xl">
                        🏥
                      </div>
                    )}

                    <div className="p-4">
                      <h3 className="line-clamp-2 font-semibold text-brand-navy">
                        {service.name}
                      </h3>

                      {service.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                          {service.description}
                        </p>
                      )}

                      <p className="mt-2 font-bold text-brand-green">
                        {formatCurrency(service.price)}
                      </p>

                      {service.durationMinutes && (
                        <p className="mt-1 text-xs text-gray-500">
                          Duration: {service.durationMinutes} mins
                        </p>
                      )}

                      <AddToCartButton
                        id={service.id}
                        name={service.name}
                        price={service.price}
                        type="SERVICE"
                        image={service.images?.[0]}
                        partnerId={partner.id}
                        partnerName={partner.name}
                        partnerSlug={partner.slug}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="mt-8">
          <Link href="/" className="text-sm text-brand-green hover:underline">
            ← Back to marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}