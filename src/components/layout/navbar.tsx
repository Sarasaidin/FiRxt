"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  MapPin,
  Search,
  LogIn,
  LogOut,
  User,
  ChevronDown,
  ShoppingCart,
  Menu,
  X,
} from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { FiRxtLogo } from "./firxt-logo";

export function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();

  const itemCountFn = useCartStore((s) => s.itemCount);
  const rawItemCount = itemCountFn();

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const itemCount = mounted ? rawItemCount : 0;

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const keyword = searchQuery.trim();

    if (keyword) {
      router.push(`/search?q=${encodeURIComponent(keyword)}`);
      setMobileMenuOpen(false);
    }
  }

  function handleLocateMe() {
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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-navy text-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        {/* Logo */}
        <Link href="/" className="shrink-0" aria-label="FiRxt home">
          <FiRxtLogo showTagline showPoweredBy />
        </Link>

        {/* Search bar */}
        <form
          onSubmit={handleSearch}
          className="hidden flex-1 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 md:flex"
        >
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search pharmacies, clinics, products..."
            className="flex-1 bg-transparent text-sm text-white placeholder-white/60 focus:outline-none"
          />

          <button
            type="submit"
            className="text-white/80 transition-colors hover:text-white"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>

        {/* Locate Me */}
        <button
          type="button"
          onClick={handleLocateMe}
          className="hidden items-center gap-1 rounded-lg border border-white/30 px-3 py-2 text-sm transition-colors hover:bg-white/10 md:flex"
        >
          <MapPin className="h-4 w-4" />
          Locate Me
        </button>

        {/* Map View */}
        <Link
          href="/map"
          className="hidden items-center gap-1 text-sm transition-colors hover:text-brand-teal md:flex"
        >
          <MapPin className="h-4 w-4" />
          Map View
        </Link>

        {/* Partner with us */}
        <Link
          href="/partner-register"
          className="hidden text-sm transition-colors hover:text-brand-teal lg:block"
        >
          Partner with us
        </Link>

        {/* Mobile search shortcut */}
        <button
          type="button"
          onClick={() => router.push("/search")}
          className="ml-auto flex items-center gap-1 text-sm transition-colors hover:text-brand-teal md:hidden"
          aria-label="Open search"
        >
          <Search className="h-5 w-5" />
        </button>

        {/* Cart */}
        <Link
          href="/cart"
          className="relative flex items-center transition-colors hover:text-brand-teal"
          aria-label="Cart"
        >
          <ShoppingCart className="h-5 w-5" />

          {mounted && itemCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-red px-1 text-xs font-bold text-white">
              {itemCount}
            </span>
          )}
        </Link>

        {/* User menu */}
        {session ? (
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((value) => !value)}
              className="flex items-center gap-1 text-sm transition-colors hover:text-brand-teal"
            >
              <User className="h-4 w-4" />

              <span className="hidden sm:inline">
                {session.user?.name?.split(" ")[0] || "Account"}
              </span>

              <ChevronDown className="h-4 w-4" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg bg-white py-2 text-brand-navy shadow-lg">
                <div className="border-b border-gray-100 px-4 py-2">
                  <p className="truncate text-sm font-semibold">
                    {session.user?.name}
                  </p>

                  <p className="truncate text-xs text-gray-500">
                    {session.user?.email}
                  </p>
                </div>

                <Link
                  href="/profile"
                  className="block px-4 py-2 text-sm hover:bg-gray-50"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Profile
                </Link>

                <Link
                  href="/orders"
                  className="block px-4 py-2 text-sm hover:bg-gray-50"
                  onClick={() => setUserMenuOpen(false)}
                >
                  My Orders
                </Link>

                {session.user?.role === "PARTNER" &&
                  session.user?.partnerStatus === "APPROVED" && (
                    <Link
                      href="/partner-dashboard"
                      className="block px-4 py-2 text-sm hover:bg-gray-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Partner Dashboard
                    </Link>
                  )}

                {session.user?.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="block px-4 py-2 text-sm hover:bg-gray-50"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Admin Panel
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-brand-red hover:bg-gray-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="hidden items-center gap-1 text-sm transition-colors hover:text-brand-teal sm:flex"
          >
            <LogIn className="h-4 w-4" />
            Login
          </Link>
        )}

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((value) => !value)}
          className="md:hidden"
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-brand-navy px-4 pb-4 md:hidden">
          <form
            onSubmit={handleSearch}
            className="mt-3 flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2"
          >
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent text-sm text-white placeholder-white/60 focus:outline-none"
            />

            <button type="submit" aria-label="Search">
              <Search className="h-4 w-4" />
            </button>
          </form>

          <nav className="mt-3 flex flex-col gap-3 text-sm">
            <Link
              href="/map"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-brand-teal"
            >
              Map View
            </Link>

            <Link
              href="/promotions"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-brand-teal"
            >
              Promotions
            </Link>

            <Link
              href="/partner-register"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-brand-teal"
            >
              Partner with us
            </Link>

            <Link
              href="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-brand-teal"
            >
              Cart ({mounted ? itemCount : 0})
            </Link>

            {!session && (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-brand-teal"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}