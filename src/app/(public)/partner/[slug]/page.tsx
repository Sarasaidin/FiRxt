export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { MapPin, Phone, Globe, Clock } from "lucide-react";

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const partner = await prisma.partner.findUnique({
    where: { slug },
    select: { name: true, description: true },
  });
  return {
    title: partner?.name ?? "Partner",
    description: partner?.description ?? undefined,
  };
}

export default async function PartnerStorefrontPage({ params }: Props) {
  const { slug } = await params;

  const partner = await prisma.partner.findUnique({
    where: { slug, status: "APPROVED" },
    include: {
      products: { where: { isActive: true }, orderBy: { isFeatured: "desc" } },
      services: { where: { isActive: true }, orderBy: { isFeatured: "desc" } },
      reviews: {
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      },
      _count: { select: { reviews: true } },
    },
  });

  if (!partner) notFound();

  const typeLabel =
    partner.type === "PHARMACY"
      ? "Community Pharmacy"
      : partner.type === "CLINIC"
      ? "Medical Clinic"
      : partner.type === "WELLNESS_CENTER"
      ? "Wellness Center"
      : "Diagnostic Lab";

  return (
    <div>
      {/* Banner */}
      <div className="relative h-48 bg-gradient-to-r from-brand-navy to-brand-green">
        {partner.bannerUrl && (
          <Image
            src={partner.bannerUrl}
            alt={partner.name}
            fill
            className="object-cover opacity-40"
          />
        )}
      </div>

      <div className="mx-auto max-w-7xl px-4 -mt-12 pb-12">
        {/* Profile card */}
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 flex-shrink-0 rounded-xl overflow-hidden border-2 border-white shadow-md bg-brand-navy text-white flex items-center justify-center text-2xl font-bold">
              {partner.logoUrl ? (
                <Image src={partner.logoUrl} alt={partner.name} width={80} height={80} className="h-full w-full object-cover" />
              ) : (
                partner.name.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-brand-navy">{partner.name}</h1>
                {partner.isVerified && <Badge variant="blue">Verified</Badge>}
                <Badge variant="green">{typeLabel}</Badge>
              </div>
              {partner.description && (
                <p className="text-gray-600 text-sm mt-1">{partner.description}</p>
              )}
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {partner.addressLine1}, {partner.city}, {partner.state}
                </span>
                {partner.phone && (
                  <a href={`tel:${partner.phone}`} className="flex items-center gap-1 hover:text-brand-green">
                    <Phone className="h-4 w-4" /> {partner.phone}
                  </a>
                )}
                {partner.website && (
                  <a href={partner.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-brand-green">
                    <Globe className="h-4 w-4" /> Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products & Services */}
          <div className="lg:col-span-2 space-y-6">
            {/* Products */}
            {partner.products.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-brand-navy mb-3">Products</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {partner.products.map((product) => (
                    <Card key={product.id} className="p-4">
                      {product.images[0] && (
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          width={300}
                          height={180}
                          className="w-full h-36 object-cover rounded-lg mb-3"
                        />
                      )}
                      <h3 className="font-semibold text-brand-navy text-sm">{product.name}</h3>
                      {product.brand && (
                        <p className="text-xs text-gray-500">{product.brand}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-bold text-brand-green">
                          {formatCurrency(product.price)}
                        </span>
                        {product.comparePrice && (
                          <span className="text-xs text-gray-400 line-through">
                            {formatCurrency(product.comparePrice)}
                          </span>
                        )}
                      </div>
                      {product.requiresPrescription && (
                        <Badge variant="yellow" className="mt-1 text-xs">Rx Required</Badge>
                      )}
                      <AddToCartButton
                        id={product.id}
                        name={product.name}
                        price={product.price}
                        type="PHYSICAL"
                        image={product.images[0]}
                        partnerId={partner.id}
                        partnerName={partner.name}
                        partnerSlug={partner.slug}
                        stock={product.stock}
                      />
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Services */}
            {partner.services.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-brand-navy mb-3">Services</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {partner.services.map((service) => (
                    <Card key={service.id} className="p-4">
                      {service.images[0] && (
                        <Image
                          src={service.images[0]}
                          alt={service.name}
                          width={300}
                          height={180}
                          className="w-full h-36 object-cover rounded-lg mb-3"
                        />
                      )}
                      <h3 className="font-semibold text-brand-navy text-sm">{service.name}</h3>
                      {service.durationMinutes && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" /> {service.durationMinutes} min
                        </p>
                      )}
                      <div className="mt-2">
                        <span className="font-bold text-brand-green">
                          {formatCurrency(service.price)}
                        </span>
                      </div>
                      <AddToCartButton
                        id={service.id}
                        name={service.name}
                        price={service.price}
                        type="SERVICE"
                        image={service.images[0]}
                        partnerId={partner.id}
                        partnerName={partner.name}
                        partnerSlug={partner.slug}
                      />
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {partner.products.length === 0 && partner.services.length === 0 && (
              <Card className="p-8 text-center text-gray-500">
                <p>No products or services listed yet.</p>
              </Card>
            )}
          </div>

          {/* Sidebar: Reviews */}
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-bold text-brand-navy mb-3">
                Reviews ({partner._count.reviews})
              </h3>
              {partner.reviews.length === 0 ? (
                <p className="text-sm text-gray-500">No reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {partner.reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-100 pb-3 last:border-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{review.user.name}</span>
                        <span className="text-yellow-500">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                      </div>
                      {review.body && <p className="text-xs text-gray-600">{review.body}</p>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
