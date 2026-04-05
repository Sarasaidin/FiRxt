"use client";

import dynamic from "next/dynamic";

const PartnerMap = dynamic(() => import("./partner-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[calc(100vh-56px)] w-full flex items-center justify-center bg-gray-100">
      <div className="text-gray-500">Loading map...</div>
    </div>
  ),
});

interface Partner {
  id: string;
  slug: string;
  name: string;
  type: string;
  city: string;
  state: string;
  addressLine1: string;
  logoUrl: string | null;
  latitude: number;
  longitude: number;
  isVerified: boolean;
  phone: string | null;
}

export function MapPageClient({ partners }: { partners: Partner[] }) {
  return <PartnerMap partners={partners} />;
}
