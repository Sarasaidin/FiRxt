export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { MapPageClient } from "@/components/map/map-page-client";

export const metadata = { title: "Map View" };

export default async function MapPage() {
  const partners = await prisma.partner.findMany({
    where: { status: "APPROVED" },
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      city: true,
      state: true,
      addressLine1: true,
      logoUrl: true,
      latitude: true,
      longitude: true,
      isVerified: true,
      phone: true,
    },
  });

  return <MapPageClient partners={partners} />;
}
