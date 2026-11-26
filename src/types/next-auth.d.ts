
import type {
  PartnerStatus,
  PartnerType,
  UserRole,
} from "@prisma/client";
import type { DefaultSession } from "next-auth";
import "next-auth";

export interface SessionPartner {
  id: string;
  name: string;
  slug: string;
  type: PartnerType;
  status: PartnerStatus;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      partnerId?: string;
      partnerStatus?: PartnerStatus;
      partners: SessionPartner[];
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    partnerId?: string;
    partnerStatus?: PartnerStatus;
    partners?: SessionPartner[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    partnerId?: string;
    partnerStatus?: PartnerStatus;
    partners?: SessionPartner[];
  }
}
