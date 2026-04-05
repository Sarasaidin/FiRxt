import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers/providers";

export const metadata: Metadata = {
  title: {
    default: "FiRxt — Live Smart",
    template: "%s | FiRxt",
  },
  description:
    "FiRxt e-Marketplace: Malaysia's trusted healthcare and wellness marketplace connecting you to verified pharmacies and clinics.",
  keywords: ["pharmacy", "clinic", "healthcare", "wellness", "malaysia"],
  openGraph: {
    title: "FiRxt — Live Smart",
    description: "Malaysia's trusted healthcare and wellness marketplace",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
