"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const keyword = query.trim();

    if (keyword) {
      router.push(`/search?q=${encodeURIComponent(keyword)}`);
    }
  }

  function handleUseLocation() {
    if (!navigator.geolocation) {
      router.push("/map");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        router.push(
          `/map?lat=${position.coords.latitude}&lng=${position.coords.longitude}`
        );
      },
      () => {
        router.push("/map");
      }
    );
  }

  return (
    <section className="bg-teal-gradient px-4 py-16 text-center">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-brand-navy md:text-4xl">
          Reserve & Pay{" "}
          <span className="text-brand-green">Online</span>, Collect In Store
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-base text-gray-700 md:text-lg">
          Find trusted clinics and pharmacies near you. Reserve products or
          services online, then collect or attend in person.
        </p>

        <form
          onSubmit={handleSearch}
          className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search clinics, pharmacies, products, services..."
              className="h-14 rounded-xl pl-12 text-base"
            />
          </div>

          <Button type="submit" className="h-14 rounded-xl px-8">
            Search
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-center gap-4 text-sm text-brand-navy">
          <button
            type="button"
            onClick={handleUseLocation}
            className="inline-flex items-center gap-1 hover:text-brand-green"
          >
            <MapPin className="h-4 w-4" />
            Use my location
          </button>

          <span className="text-gray-300">|</span>

          <Link href="/map" className="hover:text-brand-green">
            Browse on map
          </Link>
        </div>
      </div>
    </section>
  );
}

export default HeroSearch;