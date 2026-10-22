
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  listRefunds: vi.fn(),
  createRefund: vi.fn(),
  claim: vi.fn(),
  release: vi.fn(),
  ownsClaim: vi.fn(),
  updateWhileClaimed: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    paymentRecovery: {
      upsert: mocks.upsert,
    },
  },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    refunds: {
      list: mocks.listRefunds,
      create: mocks.createRefund,
    },
  },
}));

vi.mock("@/lib/payment-recovery-claim", () => ({
  claimPaymentRecovery: mocks.claim,
  releasePaymentRecoveryClaim: mocks.release,
}));

vi.mock("@/lib/payment-recovery-claim-ownership", () => ({
  ownsActivePaymentRecoveryClaim: mocks.ownsClaim,
  updateRecoveryWhileClaimed: mocks.updateWhileClaimed,
}));

import { recoverPaidCheckout } from "./payment-recovery";

const session = {
  id: "cs_test_recovery_001",
  payment_intent: "pi_test_recovery_001",
  amount_total: 5000,
  currency: "myr",
} as never;

const claim = {
  recoveryId: "recovery_001",
  claimToken: "claim_token_001",
};

const recovery = {
  id: "recovery_001",
  stripeSessionId: "cs_test_recovery_001",
  stripePaymentIntentId: "pi_test_recovery_001",
  amount: 5000,
  currency: "myr",
  status: "PENDING",
};

describe("recoverPaidCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.upsert.mockResolvedValue(recovery);
    mocks.claim.mockResolvedValue(claim);
    mocks.release.mockResolvedValue(true);
    mocks.ownsClaim.mockResolvedValue(true);
    mocks.updateWhileClaimed.mockResolvedValue(true);

    mocks.listRefunds.mockResolvedValue({
      data: [],
      has_more: false,
    });

    mocks.createRefund.mockResolvedValue({
      id: "re_test_recovery_001",
      status: "succeeded",
      metadata: {
        checkoutSessionId: "cs_test_recovery_001",
      },
    });
  });

  it("marks recovery refunded only after Stripe confirms success", async () => {
    await recoverPaidCheckout(session, "Insufficient stock");

    expect(mocks.createRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_intent: "pi_test_recovery_001",
      }),
      expect.objectContaining({
        idempotencyKey: "fi-rxt-recovery-cs_test_recovery_001",
      }),
    );

    expect(mocks.updateWhileClaimed).toHaveBeenCalledWith(
      claim,
      "REFUNDED",
      expect.objectContaining({
        stripeRefundId: "re_test_recovery_001",
        lastError: null,
      }),
    );

    expect(mocks.release).toHaveBeenCalledWith(claim);
  });

  it("reconciles an existing successful refund without creating another", async () => {
    mocks.listRefunds.mockResolvedValue({
      has_more: false,
      data: [
        {
          id: "re_existing",
          status: "succeeded",
          metadata: {
            checkoutSessionId: "cs_test_recovery_001",
          },
        },
      ],
    });

    await recoverPaidCheckout(session, "Insufficient stock");

    expect(mocks.createRefund).not.toHaveBeenCalled();

    expect(mocks.updateWhileClaimed).toHaveBeenCalledWith(
      claim,
      "REFUNDED",
      expect.objectContaining({
        stripeRefundId: "re_existing",
      }),
    );
  });

  it("does not report success when Stripe refund creation fails", async () => {
    mocks.createRefund.mockRejectedValue(
      new Error("Simulated Stripe timeout"),
    );

    await expect(
      recoverPaidCheckout(session, "Insufficient stock"),
    ).rejects.toThrow("Refund outcome is uncertain");

    expect(mocks.updateWhileClaimed).toHaveBeenCalledWith(
      claim,
      "REFUNDING",
      expect.objectContaining({
        lastError: expect.stringContaining("Simulated Stripe timeout"),
      }),
    );
  });

  it("marks mismatched recovery data for manual review without issuing a refund", async () => {
    mocks.upsert.mockResolvedValue({
      ...recovery,
      amount: 4000,
    });

    await expect(
      recoverPaidCheckout(session, "Insufficient stock"),
    ).rejects.toThrow("Payment recovery data mismatch");

    expect(mocks.createRefund).not.toHaveBeenCalled();

    expect(mocks.updateWhileClaimed).toHaveBeenCalledWith(
      claim,
      "MANUAL_REVIEW",
      expect.objectContaining({
        lastError: expect.stringContaining("Payment recovery data mismatch"),
      }),
    );

    expect(mocks.release).toHaveBeenCalledWith(claim);
  });
  it("does not create a refund when another matching refund is pending", async () => {
    mocks.listRefunds.mockResolvedValue({
      has_more: false,
      data: [
        {
          id: "re_pending",
          status: "pending",
          metadata: {
            checkoutSessionId: "cs_test_recovery_001",
          },
        },
      ],
    });

    await expect(
      recoverPaidCheckout(session, "Insufficient stock"),
    ).rejects.toThrow("Stripe refund is not yet confirmed");

    expect(mocks.createRefund).not.toHaveBeenCalled();
  });
  it("requires manual review when multiple refunds match the Checkout Session", async () => {
    mocks.listRefunds.mockResolvedValue({
      has_more: false,
      data: [
        {
          id: "re_duplicate_1",
          status: "succeeded",
          metadata: { checkoutSessionId: "cs_test_recovery_001" },
        },
        {
          id: "re_duplicate_2",
          status: "succeeded",
          metadata: { checkoutSessionId: "cs_test_recovery_001" },
        },
      ],
    });

    await expect(
      recoverPaidCheckout(session, "Insufficient stock"),
    ).rejects.toThrow("Multiple matching refunds");

    expect(mocks.createRefund).not.toHaveBeenCalled();

    expect(mocks.updateWhileClaimed).toHaveBeenCalledWith(
      claim,
      "MANUAL_REVIEW",
      expect.objectContaining({
        lastError: expect.stringContaining("Multiple matching refunds"),
      }),
    );
  });
});
