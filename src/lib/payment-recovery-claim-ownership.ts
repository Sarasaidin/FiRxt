import { prisma } from "@/lib/prisma";
import type { RecoveryClaim } from "@/lib/payment-recovery-claim";

export async function ownsActivePaymentRecoveryClaim(
  claim: RecoveryClaim
): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "payment_recoveries"
    WHERE
      "id" = ${claim.recoveryId}
      AND "claimToken" = ${claim.claimToken}
      AND "claimExpiresAt" > CURRENT_TIMESTAMP
      AND "status" IN ('PENDING', 'REFUNDING')
    LIMIT 1
  `;

  return rows.length === 1;
}

/**
 * Performs a state update only while the caller owns an unexpired lease.
 * The ownership predicate and update execute in the same SQL statement.
 */

export async function updateRecoveryWhileClaimed(
  claim: RecoveryClaim,
  status: "PENDING" | "REFUNDING" | "REFUNDED" | "MANUAL_REVIEW",
  fields: {
    stripeRefundId?: string | null;
    lastError?: string | null;
    incrementAttempts?: boolean;
  } = {}
): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE "payment_recoveries"
    SET
      "status" = ${status}::"PaymentRecoveryStatus",
      "stripeRefundId" = CASE
        WHEN ${fields.stripeRefundId !== undefined}
        THEN ${fields.stripeRefundId ?? null}
        ELSE "stripeRefundId"
      END,
      "lastError" = CASE
        WHEN ${fields.lastError !== undefined}
        THEN ${fields.lastError ?? null}
        ELSE "lastError"
      END,
      "attempts" = "attempts" + ${fields.incrementAttempts ? 1 : 0},
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE
      "id" = ${claim.recoveryId}
      AND "claimToken" = ${claim.claimToken}
      AND "claimExpiresAt" > CURRENT_TIMESTAMP
      AND "status" IN ('PENDING', 'REFUNDING')
    RETURNING "id"
  `;

  return rows.length === 1;
}