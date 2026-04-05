import type { PartnerStatus, UserRole } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      partnerId?: string;
      partnerStatus?: PartnerStatus;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    partnerId?: string;
    partnerStatus?: PartnerStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    partnerId?: string;
    partnerStatus?: PartnerStatus;
  }
}
