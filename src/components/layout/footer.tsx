import Link from "next/link";
import { FiRxtLogoDark } from "./firxt-logo";

export function Footer() {
  return (
    <footer className="bg-brand-navy text-white mt-16">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <FiRxtLogoDark className="mb-4 [&_p]:text-white/60" />
            <p className="text-sm text-white/60">
              Malaysia&apos;s trusted healthcare and wellness marketplace
              connecting you to verified pharmacies and clinics.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link href="/" className="hover:text-white">Home</Link></li>
              <li><Link href="/map" className="hover:text-white">Map View</Link></li>
              <li><Link href="/promotions" className="hover:text-white">Promotions</Link></li>
              <li><Link href="/search" className="hover:text-white">Search</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">For Partners</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link href="/partner-register" className="hover:text-white">Register Your Business</Link></li>
              <li><Link href="/partner-dashboard" className="hover:text-white">Partner Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Support</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li><a href="mailto:support@firxt.com" className="hover:text-white">support@firxt.com</a></li>
              <li><Link href="/about" className="hover:text-white">About FiRxt</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-white/20 pt-6 text-center text-xs text-white/50">
          © {new Date().getFullYear()} FiRxt Sdn Bhd. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
