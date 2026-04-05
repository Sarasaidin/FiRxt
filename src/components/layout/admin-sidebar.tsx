"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Home, Store, Package, Users, ShoppingBag, BarChart2, Tag,
  Settings, LogOut, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { section: "General", items: [
    { href: "/admin", label: "Home", icon: Home, exact: true },
    { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
    { href: "/admin/partners", label: "Partners", icon: Store },
    { href: "/admin/customers", label: "Customers", icon: Users },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
  ]},
  { section: "Marketing", items: [
    { href: "/admin/promotions", label: "Promotions", icon: Tag },
  ]},
  { section: "Configure", items: [
    { href: "/admin/configure/design", label: "Design", icon: Settings },
  ]},
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 flex-shrink-0 bg-brand-navy text-white flex flex-col">
      <div className="p-4 border-b border-white/10">
        <div className="bg-white/10 rounded-full px-3 py-1 inline-block">
          <span className="font-black text-sm">
            <span className="text-brand-green">Fi</span>
            <span className="text-brand-red">R</span>
            <span className="text-brand-green">xt</span>
          </span>
        </div>
        <p className="text-xs text-white/50 mt-2">Admin Dashboard</p>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        {navItems.map((section) => (
          <div key={section.section} className="mb-4">
            <p className="px-3 py-1 text-xs font-semibold uppercase text-white/40 tracking-wider">
              {section.section}
            </p>
            <div className="space-y-0.5 mt-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = (item as any).exact
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
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-1">
        <Link href="/" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors">
          <ExternalLink className="h-4 w-4" /> View Website
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
