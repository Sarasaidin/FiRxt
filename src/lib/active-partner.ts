
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const ACTIVE_PARTNER_COOKIE = "firxt-active-partner";

export async function getPartnerContext() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const cookieStore = await cookies();
  const selectedPartnerId = cookieStore.get(
    ACTIVE_PARTNER_COOKIE
  )?.value;

  // Retrieve only businesses owned by the authenticated user.
  const partners = await prisma.partner.findMany({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      status: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Use the explicitly selected business when available.
  let activePartner = selectedPartnerId
    ? partners.find((partner) => partner.id === selectedPartnerId) ?? null
    : null;

  // Preserve compatibility for accounts with exactly one business.
  if (!selectedPartnerId && partners.length === 1) {
    activePartner = partners[0];
  }

  return {
    userId: session.user.id,
    partners,
    activePartner,
  };
}
