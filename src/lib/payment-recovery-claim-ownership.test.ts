
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  claimPaymentRecovery,
  releasePaymentRecoveryClaim,
} from "@/lib/payment-recovery-claim";
import {
  ownsActivePaymentRecoveryClaim,
  updateRecoveryWhileClaimed,
} from "@/lib/payment-recovery-claim-ownership";

describe("Payment recovery claim ownership", () => {
  let recoveryId: string;

  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL ?? "";

    if (!databaseUrl.includes("localhost:55432/firxt_lease_test")) {
      throw new Error(
        "Safety check failed: use the local firxt_lease_test database."
      );
    }

    await prisma.$connect();
  });

  beforeEach(async () => {
    await prisma.paymentRecovery.deleteMany({
      where: {
        stripeSessionId: { startsWith: "cs_test_claim_owner_" },
      },
    });

    const recovery = await prisma.paymentRecovery.create({
      data: {
        stripeSessionId: `cs_test_claim_owner_${crypto.randomUUID()}`,
        amount: 1000,
        currency: "myr",
        reason: "Automated test: claim ownership",
        status: "PENDING",
      },
    });

    recoveryId = recovery.id;
  });

  afterAll(async () => {
    await prisma.paymentRecovery.deleteMany({
      where: {
        stripeSessionId: { startsWith: "cs_test_claim_owner_" },
      },
    });

    await prisma.$disconnect();
  });

  it("recognizes the current owner of an active claim", async () => {
    const claim = await claimPaymentRecovery(recoveryId);

    expect(claim).not.toBeNull();
    expect(await ownsActivePaymentRecoveryClaim(claim!)).toBe(true);
  });

  it("rejects a claim with an incorrect token", async () => {
    const claim = await claimPaymentRecovery(recoveryId);

    expect(claim).not.toBeNull();

    expect(
      await ownsActivePaymentRecoveryClaim({
        recoveryId,
        claimToken: "incorrect-token",
      })
    ).toBe(false);
  });

  it("rejects a claim after it has been released", async () => {
    const claim = await claimPaymentRecovery(recoveryId);

    expect(claim).not.toBeNull();
    await releasePaymentRecoveryClaim(claim!);

    expect(await ownsActivePaymentRecoveryClaim(claim!)).toBe(false);
  });

  it("rejects a claim after the recovery is marked refunded", async () => {
    const claim = await claimPaymentRecovery(recoveryId);

    expect(claim).not.toBeNull();

    await prisma.paymentRecovery.update({
      where: { id: recoveryId },
      data: { status: "REFUNDED" },
    });

    expect(await ownsActivePaymentRecoveryClaim(claim!)).toBe(false);
  }); it("updates recovery state while the claim is active", async () => {
    const claim = await claimPaymentRecovery(recoveryId);

    expect(claim).not.toBeNull();

    const updated = await updateRecoveryWhileClaimed(
      claim!,
      "REFUNDING",
      { incrementAttempts: true, lastError: null },
    );

    expect(updated).toBe(true);

    const recovery = await prisma.paymentRecovery.findUnique({
      where: { id: recoveryId },
    });

    expect(recovery?.status).toBe("REFUNDING");
    expect(recovery?.attempts).toBe(1);
  });

  it("rejects a state update after the claim is released", async () => {
    const claim = await claimPaymentRecovery(recoveryId);

    expect(claim).not.toBeNull();
    await releasePaymentRecoveryClaim(claim!);

    const updated = await updateRecoveryWhileClaimed(claim!, "REFUNDED", {
      stripeRefundId: "re_test_not_allowed",
    });

    expect(updated).toBe(false);

    const recovery = await prisma.paymentRecovery.findUnique({
      where: { id: recoveryId },
    });

    expect(recovery?.status).toBe("PENDING");
    expect(recovery?.stripeRefundId).toBeNull();
  });

  it("rejects a state update after the claim expires", async () => {
    const claim = await claimPaymentRecovery(recoveryId);

    expect(claim).not.toBeNull();

    await prisma.paymentRecovery.update({
      where: { id: recoveryId },
      data: {
        claimExpiresAt: new Date(Date.now() - 60_000),
      },
    });

    expect(await ownsActivePaymentRecoveryClaim(claim!)).toBe(false);

    const updated = await updateRecoveryWhileClaimed(claim!, "REFUNDED", {
      stripeRefundId: "re_test_expired_claim",
    });

    expect(updated).toBe(false);

    const recovery = await prisma.paymentRecovery.findUnique({
      where: { id: recoveryId },
    });

    expect(recovery?.status).toBe("PENDING");
    expect(recovery?.stripeRefundId).toBeNull();
  });
});
