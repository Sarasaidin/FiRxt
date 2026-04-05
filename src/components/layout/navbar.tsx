"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { MapPin, Search, LogIn, LogOut, User, ChevronDown, ShoppingCart, Menu, X } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { FiRxtLogo } from "./firxt-logo";

export function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const itemCount = useCartStore((s) => s.itemCount)();
  const [searchQuery, setSearchQuery] = useState("");
  const [deliveryType, setDeliveryType] = useState("Home Delivery");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  return (
    <nav className="sticky top-0 z-50 bg-brand-navy text-white shadow-md">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center gap-3">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <FiRxtLogo className="h-8" />
          </Link>

          {/* Delivery Type Toggle */}
          <div className="hidden md:flex">
            <select
              value={deliveryType}
              onChange={(e) => setDeliveryType(e.target.value)}
              className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white border border-white/20 focus:outline-none focus:ring-1 focus:ring-brand-green"
            >
              <option value="Home Delivery">Home Deliv...</option>
              <option value="Click & Collect">Click & Collect</option>
            </select>
          </div>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 items-center gap-2 rounded-lg bg-white/10 border border-white/20 px-3 py-1.5"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pharmacies, clinics, products..."
              className="flex-1 bg-transparent text-sm text-white placeholder-white/60 focus:outline-none"
            />
            <button type="submit">
              <Search className="h-4 w-4 text-white/70" />
            </button>
          </form>

          {/* Locate Me */}
          <button
            onClick={() => router.push("/map")}
            className="hidden md:flex items-center gap-1 rounded-lg border border-white/30 px-3 py-1.5 text-sm hover:bg-white/10 transition-colors"
          >
            <MapPin className="h-4 w-4" />
            <span>Locate Me</span>
          </button>

          {/* Spacer */}
          <div className="flex-1 md:flex-none" />

          {/* Map View */}
          <Link
            href="/map"
            className="hidden md:flex items-center gap-1 text-sm hover:text-brand-teal transition-colors"
          >
            <MapPin className="h-4 w-4" />
            <span>Map View</span>
          </Link>

          {/* Partner with us */}
          <Link
            href="/partner-register"
            className="hidden md:block text-sm hover:text-brand-teal transition-colors whitespace-nowrap"
          >
            Partner with us
          </Link>

          {/* Search icon (mobile) */}
          <button
            onClick={() => router.push("/search")}
            className="md:hidden flex items-center gap-1 text-sm hover:text-brand-teal"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Cart */}
          <Link href="/cart" className="relative hidden md:flex items-center gap-1 text-sm hover:text-brand-teal transition-colors">
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-red text-xs font-bold">
                {itemCount}
              </span>
            )}
          </Link>

          {/* User */}
          {session ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1 text-sm hover:text-brand-teal transition-colors"
              >
                <User className="h-4 w-4" />
                <span className="hidden md:block max-w-[100px] truncate">
                  {session.user?.name?.split(" ")[0]}
                </span>
                <ChevronDown className="h-3 w-3" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-8 z-50 w-48 rounded-lg bg-white py-1 shadow-lg border border-gray-200 text-gray-700 text-sm">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="font-medium">{session.user?.name}</p>
                    <p className="text-xs text-gray-500">{session.user?.email}</p>
                  </div>
                  <Link href="/profile" className="block px-4 py-2 hover:bg-gray-50">
                    Profile
                  </Link>
                  <Link href="/orders" className="block px-4 py-2 hover:bg-gray-50">
                    My Orders
                  </Link>
                  {session.user?.role === "PARTNER" && session.user?.partnerStatus === "APPROVED" && (
                    <Link href="/partner-dashboard" className="block px-4 py-2 hover:bg-gray-50">
                      Partner Dashboard
                    </Link>
                  )}
                  {session.user?.role === "ADMIN" && (
                    <Link href="/admin" className="block px-4 py-2 hover:bg-gray-50">
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-50 text-brand-red"
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
              className="flex items-center gap-1 text-sm hover:text-brand-teal transition-colors"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden md:block">Login</span>
            </Link>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
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
          <div className="md:hidden border-t border-white/20 py-3 flex flex-col gap-2">
            <form onSubmit={handleSearch} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="flex-1 bg-transparent text-sm text-white placeholder-white/60 focus:outline-none"
              />
              <button type="submit">
                <Search className="h-4 w-4 text-white/70" />
              </button>
            </form>
            <Link href="/map" className="text-sm py-2 hover:text-brand-teal" onClick={() => setMobileMenuOpen(false)}>Map View</Link>
            <Link href="/promotions" className="text-sm py-2 hover:text-brand-teal" onClick={() => setMobileMenuOpen(false)}>Promotions</Link>
            <Link href="/partner-register" className="text-sm py-2 hover:text-brand-teal" onClick={() => setMobileMenuOpen(false)}>Partner with us</Link>
            <Link href="/cart" className="text-sm py-2 hover:text-brand-teal" onClick={() => setMobileMenuOpen(false)}>Cart ({itemCount})</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
