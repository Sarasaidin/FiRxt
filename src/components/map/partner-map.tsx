"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Navigation, Search, SlidersHorizontal, X } from "lucide-react";
import { haversineDistance, formatDistance } from "@/lib/utils";

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface PartnerService {
  id: string;
  name: string;
  description: string | null;
}

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
  services?: PartnerService[];
}

interface Props {
  partners: Partner[];
}

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const characters: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return characters[char];
  });
}

function partnerServiceText(partner: Partner) {
  return (partner.services ?? [])
    .map((service) => `${service.name} ${service.description ?? ""}`)
    .join(" ")
    .toLowerCase();
}

function matchesServiceFilter(partner: Partner, serviceFilter: string) {
  if (serviceFilter === "ALL") return true;

  const serviceText = partnerServiceText(partner);

  if (serviceFilter === "BLOOD_TEST") {
    return (
      serviceText.includes("blood") ||
      serviceText.includes("test") ||
      serviceText.includes("panel") ||
      serviceText.includes("lab") ||
      serviceText.includes("pathology")
    );
  }

  if (serviceFilter === "VACCINATION") {
    return (
      serviceText.includes("vaccin") ||
      serviceText.includes("immun") ||
      serviceText.includes("jab")
    );
  }

  if (serviceFilter === "HEALTH_SCREENING") {
    return (
      serviceText.includes("screen") ||
      serviceText.includes("checkup") ||
      serviceText.includes("check-up") ||
      serviceText.includes("health package")
    );
  }

  return true;
}

export default function PartnerMap({ partners }: Props) {
  const searchParams = useSearchParams();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  
  const initLat = parseFloat(searchParams.get("lat") ?? "3.1390");
  const initLng = parseFloat(searchParams.get("lng") ?? "101.6869");
  
  const hasInitialLocation = !isNaN(initLat) && !isNaN(initLng);

  const [userPos, setUserPos] = useState<[number, number] | null>(
    hasInitialLocation ? [initLat, initLng] : null
  );
  const [selected, setSelected] = useState<Partner | null>(null);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "PHARMACY" | "CLINIC">(
    "ALL"
  );

  const [serviceFilter, setServiceFilter] = useState<
    "ALL" | "BLOOD_TEST" | "VACCINATION" | "HEALTH_SCREENING"
  >("ALL");

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const centerLat = userPos?.[0] ?? (isNaN(initLat) ? 3.139 : initLat);
  const centerLng = userPos?.[1] ?? (isNaN(initLng) ? 101.6869 : initLng);

  function handleLocateMe() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((pos) => {
      const nextPosition: [number, number] = [
        pos.coords.latitude,
        pos.coords.longitude,
      ];

      setUserPos(nextPosition);
      mapRef.current?.setView(nextPosition, 14);
    });
  }

  const partnersWithDist = useMemo(() => {
    return partners
      .map((partner) => ({
        ...partner,
        distanceMeters: userPos
          ? haversineDistance(
              userPos[0],
              userPos[1],
              partner.latitude,
              partner.longitude
            )
          : undefined,
      }))
      .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
  }, [partners, userPos]);

  const filteredPartners = useMemo(() => {
    return partnersWithDist.filter((partner) => {
      const serviceText = partnerServiceText(partner);

      const searchableText = [
        partner.name,
        partner.type,
        partner.city,
        partner.state,
        partner.addressLine1,
        serviceText,
      ]
        .join(" ")
        .toLowerCase();

      const queryLower = query.trim().toLowerCase();

      const matchesQuery = !queryLower || searchableText.includes(queryLower);

      const matchesType =
        typeFilter === "ALL" || partner.type === typeFilter;

      const matchesService = matchesServiceFilter(partner, serviceFilter);

      return matchesQuery && matchesType && matchesService;
    });
  }, [partnersWithDist, query, typeFilter, serviceFilter]);

  const userIcon = useMemo(() => {
    return L.divIcon({
      html: `
        <div style="
          width: 16px;
          height: 16px;
          background: #2563eb;
          border: 3px solid white;
          border-radius: 999px;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
        "></div>
      `,
      className: "",
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  }, []);

  // Initialize map safely without React-Leaflet MapContainer
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const container = mapContainerRef.current as HTMLDivElement & {
      _leaflet_id?: number;
    };

    if (container._leaflet_id) {
      delete container._leaflet_id;
    }

    const mapInstance = L.map(container, {
      center: [centerLat, centerLng],
      zoom: hasInitialLocation ? 14 : 12,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapInstance);

    const markerLayer = L.layerGroup().addTo(mapInstance);

    mapRef.current = mapInstance;
    markerLayerRef.current = markerLayer;

    setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 100);

    setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 500);

    setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 1000);

    return () => {
      markerLayer.clearLayers();
      mapInstance.off();
      mapInstance.remove();

      mapRef.current = null;
      markerLayerRef.current = null;

      if (container._leaflet_id) {
        delete container._leaflet_id;
      }
    };
  }, []);

  // Update map center when location changes
  useEffect(() => {
    if (!mapRef.current) return;

    mapRef.current.setView([centerLat, centerLng], mapRef.current.getZoom());

    setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 100);
  }, [centerLat, centerLng]);

  // Fix map size when browser resizes
  useEffect(() => {
    function handleResize() {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Redraw markers whenever filters change
  useEffect(() => {
    if (!markerLayerRef.current) return;

    markerLayerRef.current.clearLayers();

    filteredPartners.forEach((partner) => {
      const services = partner.services ?? [];

      const serviceList =
        services.length > 0
          ? `
            <div style="margin-top: 8px;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; color: #0B1D3B;">
                Available services:
              </p>
              ${services
                .slice(0, 3)
                .map(
                  (service) =>
                    `<p style="margin: 2px 0; font-size: 12px; color: #4B5563;">• ${escapeHtml(
                      service.name
                    )}</p>`
                )
                .join("")}
            </div>
          `
          : "";

      const marker = L.marker([partner.latitude, partner.longitude]);

      marker.bindPopup(`
        <div style="min-width: 200px;">
          <p style="margin: 0; font-weight: 700; color: #0B1D3B;">
            ${escapeHtml(partner.name)}
          </p>

          <p style="margin: 4px 0 0; font-size: 12px; color: #6B7280;">
            ${partner.type === "PHARMACY" ? "Pharmacy" : "Clinic"}
          </p>

          <p style="margin: 8px 0 0; font-size: 13px; color: #4B5563;">
            ${escapeHtml(partner.addressLine1)}
          </p>

          ${
            partner.phone
              ? `<p style="margin: 6px 0 0; font-size: 13px; color: #4B5563;">${escapeHtml(
                  partner.phone
                )}</p>`
              : ""
          }

          ${serviceList}

          <a
            href="/partner/${encodeURIComponent(partner.slug)}"
            style="display: inline-block; margin-top: 8px; font-size: 13px; font-weight: 600; color: #16A34A; text-decoration: none;"
          >
            View Storefront
          </a>
        </div>
      `);

      marker.on("click", () => {
        setSelected(partner);

        if (window.innerWidth < 768) {
          setSidebarOpen(true);
        }
      });

      marker.addTo(markerLayerRef.current!);
    });

    if (userPos) {
      L.marker(userPos, { icon: userIcon })
        .bindPopup("You are here")
        .addTo(markerLayerRef.current);
    }
  }, [filteredPartners, userPos, userIcon]);

  // Fix map size after sidebar opens/closes
  useEffect(() => {
    setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 350);
  }, [sidebarOpen]);

  return (
    <div className="relative h-[calc(100vh-73px)] overflow-hidden">
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setSidebarOpen((value) => !value)}
        className="absolute right-3 top-3 z-[1000] flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-brand-navy shadow-md md:hidden"
      >
        {sidebarOpen ? (
          <>
            <X className="h-4 w-4" />
            Hide search
          </>
        ) : (
          <>
            <SlidersHorizontal className="h-4 w-4" />
            Show search
          </>
        )}
      </button>

      <div className="flex h-full">
        {/* Sidebar */}
        <aside
          className={`absolute left-0 top-0 z-[900] flex h-full w-80 max-w-[88vw] flex-col border-r border-gray-200 bg-white shadow-lg transition-transform duration-300 md:relative md:translate-x-0 md:shadow-none ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="border-b border-gray-100 p-4">
            <h1 className="text-xl font-bold text-brand-navy">Map View</h1>

            <p className="mt-1 text-sm text-gray-500">
              Find nearby clinics and pharmacies.
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                <Search className="h-4 w-4 text-gray-400" />

                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search clinic, pharmacy, service..."
                  className="w-full text-sm outline-none"
                />
              </div>

              {/* Merchant type filter */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "All", value: "ALL" },
                  { label: "Pharmacy", value: "PHARMACY" },
                  { label: "Clinic", value: "CLINIC" },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => {
                      const nextTypeFilter = filter.value as
                        | "ALL"
                        | "PHARMACY"
                        | "CLINIC";

                      setTypeFilter(nextTypeFilter);

                      if (nextTypeFilter !== "ALL") {
                        setServiceFilter("ALL");
                      }
                    }}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      typeFilter === filter.value
                        ? "border-brand-green bg-brand-green text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:border-brand-green hover:text-brand-green"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Service filter */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "All Services", value: "ALL" },
                  { label: "Blood Tests", value: "BLOOD_TEST" },
                  { label: "Vaccinations", value: "VACCINATION" },
                  { label: "Screening", value: "HEALTH_SCREENING" },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => {
                      const nextServiceFilter = filter.value as
                        | "ALL"
                        | "BLOOD_TEST"
                        | "VACCINATION"
                        | "HEALTH_SCREENING";

                      setServiceFilter(nextServiceFilter);

                      if (nextServiceFilter !== "ALL") {
                        setTypeFilter("ALL");
                      }
                    }}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      serviceFilter === filter.value
                        ? "border-brand-green bg-brand-green text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:border-brand-green hover:text-brand-green"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleLocateMe}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-navy/90"
              >
                <Navigation className="h-4 w-4" />
                Use My Location
              </button>
            </div>
          </div>

          <div className="border-b border-gray-100 px-4 py-3 text-sm text-gray-500">
            {filteredPartners.length} of {partners.length} locations shown
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {filteredPartners.length > 0 ? (
              filteredPartners.map((partner) => (
                <button
                  key={partner.id}
                  type="button"
                  onClick={() => {
                    setSelected(partner);

                    mapRef.current?.setView(
                      [partner.latitude, partner.longitude],
                      14
                    );

                    if (window.innerWidth < 768) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full rounded-xl border p-3 text-left transition-all hover:border-brand-green ${
                    selected?.id === partner.id
                      ? "border-brand-green bg-brand-teal/10"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-navy text-lg font-bold text-white">
                      {partner.name.charAt(0)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-brand-navy">
                        {partner.name}
                      </p>

                      <p className="text-xs text-gray-500">
                        {partner.type === "PHARMACY" ? "Pharmacy" : "Clinic"}
                      </p>

                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                        {partner.addressLine1}, {partner.city}
                      </p>

                      {(partner.services ?? []).length > 0 && (
                        <p className="mt-1 truncate text-xs text-brand-green">
                          {(partner.services ?? [])
                            .slice(0, 2)
                            .map((service) => service.name)
                            .join(", ")}
                        </p>
                      )}

                      {partner.distanceMeters !== undefined && (
                        <p className="mt-1 text-xs font-medium text-brand-green">
                          {formatDistance(partner.distanceMeters)}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center">
                <p className="text-sm font-medium text-brand-navy">
                  No locations found
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Try changing your search or filters.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Map */}
        <div className="relative h-full flex-1 overflow-hidden">
          <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />

          <div className="absolute bottom-4 left-1/2 z-[800] -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-medium text-brand-navy shadow-md md:hidden">
            {filteredPartners.length} locations shown
          </div>
        </div>
      </div>
    </div>
  );
}