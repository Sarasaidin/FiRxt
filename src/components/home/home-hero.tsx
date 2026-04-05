"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HomeHero() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleLocateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      router.push(`/map?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="bg-teal-gradient border-b border-brand-teal/50 py-10 px-4">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-bold text-brand-navy mb-2">
          Your Health, <span className="text-brand-green">Delivered Smart</span>
        </h1>
        <p className="text-gray-600 mb-6">
          Find trusted pharmacies and clinics near you. Shop health products and book
          services — all in one place.
        </p>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
          <div className="flex-1 flex items-center gap-2 rounded-xl bg-white border border-gray-200 shadow-sm px-4 py-2.5">
            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pharmacies, products, services..."
              className="flex-1 text-sm focus:outline-none text-gray-800 placeholder-gray-400"
            />
          </div>
          <Button type="submit" size="lg" className="whitespace-nowrap">
            Search
          </Button>
        </form>

        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            onClick={handleLocateMe}
            className="flex items-center gap-1.5 text-sm text-brand-navy hover:text-brand-green transition-colors"
          >
            <MapPin className="h-4 w-4" />
            Use my location
          </button>
          <span className="text-gray-300">|</span>
          <a href="/map" className="text-sm text-brand-navy hover:text-brand-green transition-colors">
            Browse on map
          </a>
        </div>
      </div>
    </div>
  );
}
