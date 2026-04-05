"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Navigation } from "lucide-react";
import { haversineDistance, formatDistance } from "@/lib/utils";
import { PartnerCard } from "@/components/partner/partner-card";

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
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

interface Props {
  partners: Partner[];
}

export default function PartnerMap({ partners }: Props) {
  const searchParams = useSearchParams();
  const initLat = parseFloat(searchParams.get("lat") ?? "3.1390");
  const initLng = parseFloat(searchParams.get("lng") ?? "101.6869");
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [selected, setSelected] = useState<Partner | null>(null);

  function handleLocateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserPos([pos.coords.latitude, pos.coords.longitude]);
    });
  }

  const partnersWithDist = partners.map((p) => ({
    ...p,
    distanceMeters: userPos
      ? haversineDistance(userPos[0], userPos[1], p.latitude, p.longitude)
      : undefined,
  })).sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));

  const center: [number, number] = userPos ?? [
    isNaN(initLat) ? 3.139 : initLat,
    isNaN(initLng) ? 101.6869 : initLng,
  ];

  const userIcon = L.divIcon({
    html: `<div class="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg"></div>`,
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 overflow-y-auto bg-white border-r border-gray-200 flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-3 z-10">
          <button
            onClick={handleLocateMe}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-navy text-white px-4 py-2 text-sm hover:bg-brand-navy/90 transition-colors"
          >
            <Navigation className="h-4 w-4" />
            Use My Location
          </button>
        </div>
        <div className="p-3 space-y-2 flex-1">
          {partnersWithDist.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className={`w-full text-left rounded-xl p-3 border transition-all hover:border-brand-green ${
                selected?.id === p.id
                  ? "border-brand-green bg-brand-teal/10"
                  : "border-gray-200"
              }`}
            >
              <div className="font-semibold text-sm text-brand-green truncate">{p.name}</div>
              <div className="text-xs text-gray-500 truncate mt-0.5">{p.addressLine1}, {p.city}</div>
              {p.distanceMeters !== undefined && (
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                  <MapPin className="h-3 w-3" />
                  {formatDistance(p.distanceMeters)}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={center}
          zoom={12}
          className="h-full w-full"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {partners.map((p) => (
            <Marker
              key={p.id}
              position={[p.latitude, p.longitude]}
              eventHandlers={{ click: () => setSelected(p) }}
            >
              <Popup>
                <div className="min-w-[180px]">
                  <p className="font-semibold text-brand-navy">{p.name}</p>
                  <p className="text-xs text-gray-600 mt-1">{p.addressLine1}</p>
                  {p.phone && <p className="text-xs text-gray-500 mt-1">{p.phone}</p>}
                  <Link
                    href={`/partner/${p.slug}`}
                    className="mt-2 inline-block rounded bg-brand-green px-3 py-1 text-xs text-white hover:bg-brand-green-dark"
                  >
                    View Storefront
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
          {userPos && (
            <Marker position={userPos} icon={userIcon}>
              <Popup>You are here</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
