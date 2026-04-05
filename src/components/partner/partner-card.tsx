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
    <Link href={`/partner/${slug}`}>
      <Card className="flex items-start gap-4 p-4 hover:shadow-md hover:border-brand-green/30 transition-all cursor-pointer group">
        {/* Logo */}
        <div className="flex-shrink-0 h-16 w-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={name}
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-brand-navy text-white text-xl font-bold">
              {name.charAt(0)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-brand-green group-hover:text-brand-green-dark transition-colors truncate">
              {name}
            </h3>
            {isVerified && (
              <Badge variant="blue" className="flex-shrink-0 text-xs">
                Verified
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {typeLabel}
          </p>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
            {addressLine1}, {city}, {state}
          </p>
          {distanceMeters !== undefined && (
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
              <MapPin className="h-3 w-3" />
              <span>{formatDistance(distanceMeters)}</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
