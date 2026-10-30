
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  claimPaymentRecovery,
  releasePaymentRecoveryClaim,
} from "@/lib/payment-recovery-claim";

describe("Payment recovery database claims", () => {
  let recoveryId: string;

  beforeAll(async () => {
    // Ensure the tests are running against the disposable local database.
    const databaseUrl = process.env.DATABASE_URL ?? "";

    if (!databaseUrl.includes("localhost:55432/firxt_lease_test")) {
      throw new Error(
        "Safety check failed: tests must use the local firxt_lease_test database."
      );
    }

    await prisma.$connect();
  });

  beforeEach(async () => {
    // Remove test records created by this test suite.
    await prisma.paymentRecovery.deleteMany({
      where: {
        stripeSessionId: {
          startsWith: "cs_test_recovery_claim_",
        },
      },
    });
    const recovery = await prisma.paymentRecovery.create({
        data: {
            stripeSessionId: `cs_test_recovery_claim_${crypto.randomUUID()}`,
            amount: 1000,
            currency: "myr",
            reason: "Automated test: recovery claim",
            status: "PENDING",
        },
    });


    recoveryId = recovery.id;
  });

  afterAll(async () => {
    await prisma.paymentRecovery.deleteMany({
      where: {
        stripeSessionId: {
          startsWith: "cs_test_recovery_claim_",
        },
      },
    });

    await prisma.$disconnect();
  });

  it("allows one worker to claim a pending recovery", async () => {
    const claim = await claimPaymentRecovery(recoveryId);

    expect(claim).not.toBeNull();
    expect(claim?.recoveryId).toBe(recoveryId);
    expect(claim?.claimToken).toBeTruthy();
  });

  it("prevents a second worker from claiming an active recovery", async () => {
    const firstClaim = await claimPaymentRecovery(recoveryId);
    const secondClaim = await claimPaymentRecovery(recoveryId);

    expect(firstClaim).not.toBeNull();
    expect(secondClaim).toBeNull();
  });

  it("allows another worker to claim after the first worker releases its claim", async () => {
    const firstClaim = await claimPaymentRecovery(recoveryId);

    expect(firstClaim).not.toBeNull();

    const released = await releasePaymentRecoveryClaim(firstClaim!);
    const secondClaim = await claimPaymentRecovery(recoveryId);

    expect(released).toBe(true);
    expect(secondClaim).not.toBeNull();
    expect(secondClaim?.claimToken).not.toBe(firstClaim?.claimToken);
  });

  it("does not release a claim using the wrong token", async () => {
    const claim = await claimPaymentRecovery(recoveryId);

    expect(claim).not.toBeNull();

    const released = await releasePaymentRecoveryClaim({
      recoveryId,
      claimToken: "incorrect-test-token",
    });

    expect(released).toBe(false);

    // The genuine claim should still block another worker.
    const secondClaim = await claimPaymentRecovery(recoveryId);
    expect(secondClaim).toBeNull();
  });

  it("does not claim a recovery that is already refunded", async () => {
    await prisma.paymentRecovery.update({
      where: { id: recoveryId },
      data: { status: "REFUNDED" },
    });

    const claim = await claimPaymentRecovery(recoveryId);

    expect(claim).toBeNull();
  });
});
