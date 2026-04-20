import Link from "next/link";
import { FiRxtLogo } from "@/components/layout/firxt-logo";

export function Footer() {
  return (
    <footer className="mt-16 bg-brand-navy text-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="flex flex-col items-start">
            <div className="flex flex-col items-center">
              <FiRxtLogo showTagline={false} />
              <p
                className="mb-4 mt-1 text-[13px] font-bold leading-none text-black/100"
                style={{ fontFamily: "Futura Std Heavy, Russo One, Arial Black, sans-serif", fontWeight: 800 }}
              >
                
              </p>
            </div>

            <p className="text-sm text-white/60">
              Malaysia&apos;s trusted healthcare and wellness marketplace
              connecting you to verified pharmacies and clinics.
            </p>
          </div>

          <div>
            <h4 className="mb-3 font-semibold">Quick Links</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link href="/" className="hover:text-white">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/map" className="hover:text-white">
                  Map View
                </Link>
              </li>
              <li>
                <Link href="/promotions" className="hover:text-white">
                  Promotions
                </Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-white">
                  Search
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold">For Partners</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link href="/partner-register" className="hover:text-white">
                  Register Your Business
                </Link>
              </li>
              <li>
                <Link href="/partner-dashboard" className="hover:text-white">
                  Partner Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold">Support</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <a href="mailto:support@firxt.com" className="hover:text-white">
                  support@firxt.com
                </a>
              </li>
              <li>
                <Link href="/about" className="hover:text-white">
                  About FiRxt
                </Link>
              </li>
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