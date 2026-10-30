
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

const CLAIM_LEASE_MS = 2 * 60 * 1000;

export type RecoveryClaim = {
  recoveryId: string;
  claimToken: string;
};

export async function claimPaymentRecovery(
  recoveryId: string
): Promise<RecoveryClaim | null> {
  const claimToken = randomUUID();
  const claimExpiresAt = new Date(Date.now() + CLAIM_LEASE_MS);

  const claimed = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE "payment_recoveries"
    SET
      "claimToken" = ${claimToken},
      "claimExpiresAt" = ${claimExpiresAt},
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE
      "id" = ${recoveryId}
      AND "status" IN ('PENDING', 'REFUNDING')
      AND (
        "claimToken" IS NULL
        OR "claimExpiresAt" IS NULL
        OR "claimExpiresAt" <= CURRENT_TIMESTAMP
      )
    RETURNING "id"
  `;

  if (claimed.length === 0) {
    return null;
  }

  return { recoveryId, claimToken };
}

export async function releasePaymentRecoveryClaim(
  claim: RecoveryClaim
): Promise<boolean> {
  const released = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE "payment_recoveries"
    SET
      "claimToken" = NULL,
      "claimExpiresAt" = NULL,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE
      "id" = ${claim.recoveryId}
      AND "claimToken" = ${claim.claimToken}
    RETURNING "id"
  `;

  return released.length === 1;
}
