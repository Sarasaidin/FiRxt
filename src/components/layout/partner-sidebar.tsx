"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  Home, Package, Stethoscope, ShoppingBag, Tag, Store, LogOut, ExternalLink, Microscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FiRxtLogoDark } from "./firxt-logo";

const navItems = [
  { href: "/partner-dashboard", label: "Overview", icon: Home },
  { href: "/partner-dashboard/storefront", label: "Storefront", icon: Store },
  { href: "/partner-dashboard/products", label: "Products", icon: Package },
  { href: "/partner-dashboard/services", label: "Services", icon: Stethoscope },
  {
    href: "/partner-dashboard/blood-test-packages",
    label: "Blood Test Packages",
    icon: Microscope,
  },
  { href: "/partner-dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/partner-dashboard/promotions", label: "Promotions", icon: Tag },
];

type PartnerOption = {
  id: string;
  name: string;
  status: string;
};

export function PartnerSidebar({
  partners,
  activePartner,
}: {
  partners: PartnerOption[];
  activePartner: PartnerOption | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSwitching, setIsSwitching] = useState(false);

  async function handleBusinessChange(partnerId: string) {
    if (!partnerId || partnerId === activePartner?.id) return;

    setIsSwitching(true);

    try {
      const response = await fetch("/api/partner/active", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ partnerId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to switch business.");
      }

      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to switch business."
      );
    } finally {
      setIsSwitching(false);
    }
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-brand-navy text-white flex flex-col">
      <div className="p-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2 mb-1">
          <div className="bg-white/10 rounded-full px-3 py-1">
            <span className="font-black text-sm">
              <span className="text-brand-green">Fi</span>
              <span className="text-brand-red">R</span>
              <span className="text-brand-green">xt</span>
            </span>
          </div>
        </Link>
        <p className="text-xs text-white/50 mt-1">Partner Dashboard</p>
        {partners.length > 0 && (
          <div className="mt-4">
            <label
              htmlFor="active-business"
              className="mb-2 block text-xs font-medium text-white/60"
            >
              ACTIVE BUSINESS
            </label>

            <select
              id="active-business"
              value={activePartner?.id ?? ""}
              onChange={(event) => handleBusinessChange(event.target.value)}
              disabled={isSwitching}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-brand-green disabled:cursor-wait disabled:opacity-60"
            >
              {!activePartner && (
                <option value="" disabled className="text-gray-900">
                  Select a business
                </option>
              )}

              {partners.map((partner) => (
                <option
                  key={partner.id}
                  value={partner.id}
                  className="text-gray-900"
                >
                  {partner.name}
                  {partner.status !== "APPROVED" ? " (Pending)" : ""}
                </option>
              ))}
            </select>

            {isSwitching && (
              <p className="mt-1 text-xs text-white/50">
                Switching business...
              </p>
            )}
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/partner-dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-green text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-1">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          View Website
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
