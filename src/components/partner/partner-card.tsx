import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistance } from "@/lib/utils";

interface PartnerCardProps {
  id: string;
  slug: string;
  name: string;
  type: string;
  city: string;
  state: string;
  addressLine1: string;
  logoUrl?: string | null;
  distanceMeters?: number;
  isVerified?: boolean;
}

export function PartnerCard({
  slug,
  name,
  type,
  city,
  state,
  addressLine1,
  logoUrl,
  distanceMeters,
  isVerified,
}: PartnerCardProps) {
  const typeLabel =
    type === "PHARMACY"
      ? "Pharmacy"
      : type === "CLINIC"
      ? "Clinic"
      : type === "WELLNESS_CENTER"
      ? "Wellness"
      : "Lab";

  return (
    <Link href={`/partner/${slug}`} className="block h-full">
      <Card className="group flex h-full min-h-[145px] items-start gap-4 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-green/40 hover:shadow-md">
        {/* Logo */}
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-navy text-xl font-bold text-white">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={name}
              fill
              className="object-cover"
            />
          ) : (
            <span>{name.charAt(0)}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 font-semibold text-brand-navy group-hover:text-brand-green">
              {name}
            </h3>

            {isVerified && (
              <Badge className="shrink-0 bg-blue-100 text-blue-700 hover:bg-blue-100">
                Verified
              </Badge>
            )}
          </div>

          <p className="mt-1 text-sm text-gray-500">{typeLabel}</p>

          <div className="mt-2 flex items-start gap-1 text-sm text-gray-500">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />

            <p className="line-clamp-2">
              {addressLine1}, {city}, {state}
            </p>
          </div>

          {distanceMeters !== undefined && (
            <p className="mt-auto pt-3 text-sm font-medium text-brand-green">
              {formatDistance(distanceMeters)}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}