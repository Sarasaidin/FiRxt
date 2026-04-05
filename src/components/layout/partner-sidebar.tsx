"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Home, Package, Stethoscope, ShoppingBag, Tag, Store, LogOut, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FiRxtLogoDark } from "./firxt-logo";

const navItems = [
  { href: "/partner-dashboard", label: "Overview", icon: Home },
  { href: "/partner-dashboard/storefront", label: "Storefront", icon: Store },
  { href: "/partner-dashboard/products", label: "Products", icon: Package },
  { href: "/partner-dashboard/services", label: "Services", icon: Stethoscope },
  { href: "/partner-dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/partner-dashboard/promotions", label: "Promotions", icon: Tag },
];

export function PartnerSidebar() {
  const pathname = usePathname();

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
