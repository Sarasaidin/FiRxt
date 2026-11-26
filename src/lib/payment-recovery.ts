
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import {
  claimPaymentRecovery,
  releasePaymentRecoveryClaim,
} from "@/lib/payment-recovery-claim";
import {
  ownsActivePaymentRecoveryClaim,
  updateRecoveryWhileClaimed,
} from "@/lib/payment-recovery-claim-ownership";

export async function recoverPaidCheckout(
  session: Stripe.Checkout.Session,
  reason: string,
): Promise<void> {
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  if (
    !Number.isSafeInteger(session.amount_total) ||
    session.amount_total === null ||
    session.amount_total <= 0
  ) {
    throw new Error("Invalid paid Checkout Session amount.");
  }

  const recovery = await prisma.paymentRecovery.upsert({
    where: { stripeSessionId: session.id },
    create: {
      stripeSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      amount: session.amount_total,
      currency: session.currency ?? "myr",
      reason,
      status: paymentIntentId ? "PENDING" : "MANUAL_REVIEW",
      lastError: paymentIntentId
        ? null
        : "Stripe PaymentIntent ID is missing; manual review required.",
    },
    update: {},
  });

  if (recovery.status === "REFUNDED") return;

  if (recovery.status === "MANUAL_REVIEW" || !paymentIntentId) {
    throw new Error("Payment recovery requires manual review.");
  }

  const claim = await claimPaymentRecovery(recovery.id);

  if (!claim) {
    throw new Error("Payment recovery is already claimed; retry required.");
  }

  try {
    const updateWhileClaimed = async (
      status: "PENDING" | "REFUNDING" | "REFUNDED" | "MANUAL_REVIEW",
      fields: {
        stripeRefundId?: string | null;
        lastError?: string | null;
        incrementAttempts?: boolean;
      } = {},
    ) => {
      const updated = await updateRecoveryWhileClaimed(
        claim,
        status,
        fields,
      );

      if (!updated) {
        throw new Error(
          "Payment recovery claim expired or ownership changed; retry required.",
        );
      }
    };
    if (
        recovery.amount !== session.amount_total ||
        recovery.currency !== (session.currency ?? "myr") ||
        recovery.stripePaymentIntentId !== paymentIntentId
        ) {
        await updateWhileClaimed("MANUAL_REVIEW", {
            lastError: "Payment recovery data mismatch; manual review required.",
        });

        throw new Error(
            "Payment recovery data mismatch; manual review required.",
        );
        }

    // Reconcile Stripe before attempting another refund.
    const refunds = await stripe.refunds.list({
      payment_intent: paymentIntentId,
      limit: 100,
    });

    if (refunds.has_more) {
      await updateWhileClaimed("MANUAL_REVIEW", {
        lastError: "Too many refunds to reconcile safely.",
      });

      throw new Error("Refund reconciliation requires manual review.");
    }

    const matchingRefunds = refunds.data.filter(
        (refund) => refund.metadata?.checkoutSessionId === session.id,
    );

    if (matchingRefunds.length > 1) {
        await updateWhileClaimed("MANUAL_REVIEW", {
            lastError: "Multiple matching refunds found for this Checkout Session.",
        });

        throw new Error("Multiple matching refunds require manual review.");
        }

    if (matchingRefunds.length === 1) {
        const refund = matchingRefunds[0];

      if (refund.status === "succeeded") {
        await updateWhileClaimed("REFUNDED", {
          stripeRefundId: refund.id,
          lastError: null,
        });
        return;
      }

      if (
        refund.status === "pending" ||
        refund.status === "requires_action"
      ) {
        await updateWhileClaimed("REFUNDING", {
          stripeRefundId: refund.id,
          lastError: "Stripe refund is still processing.",
        });

        throw new Error("Stripe refund is not yet confirmed.");
      }

      await updateWhileClaimed("MANUAL_REVIEW", {
        stripeRefundId: refund.id,
        lastError: `Stripe refund status: ${refund.status ?? "unknown"}`,
      });

      throw new Error("Stripe refund failed; manual review required.");
    }

    // Do not blindly issue another refund if an unrelated refund exists.
    if (
      refunds.data.some(
        (refund) =>
          refund.status !== "failed" && refund.status !== "canceled",
      )
    ) {
      await updateWhileClaimed("MANUAL_REVIEW", {
        lastError: "An unrelated refund exists for this PaymentIntent.",
      });

      throw new Error("Existing refund requires manual reconciliation.");
    }

    if (!(await ownsActivePaymentRecoveryClaim(claim))) {
      throw new Error(
        "Payment recovery claim expired before refund creation; retry required.",
      );
    }

    await updateWhileClaimed("REFUNDING", {
      incrementAttempts: true,
      lastError: null,
    });

    let refund: Stripe.Refund;

    try {
      refund = await stripe.refunds.create(
        {
          payment_intent: paymentIntentId,
          metadata: {
            checkoutSessionId: session.id,
            recoveryId: recovery.id,
            reason: reason.slice(0, 500),
          },
        },
        {
          idempotencyKey: `fi-rxt-recovery-${session.id}`,
        },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Stripe error";

      await updateWhileClaimed("REFUNDING", {
        lastError: message.slice(0, 2000),
      });

      throw new Error(`Refund outcome is uncertain: ${message}`);
    }

    if (refund.status === "succeeded") {
      await updateWhileClaimed("REFUNDED", {
        stripeRefundId: refund.id,
        lastError: null,
      });
      return;
    }

    await updateWhileClaimed(
      refund.status === "pending" ||
        refund.status === "requires_action"
        ? "REFUNDING"
        : "MANUAL_REVIEW",
      {
        stripeRefundId: refund.id,
        lastError: `Stripe refund status: ${refund.status ?? "unknown"}`,
      },
    );

    throw new Error(
      `Refund ${refund.id} is not confirmed as successful.`,
    );
  } finally {
    try {
      await releasePaymentRecoveryClaim(claim);
    } catch (releaseError) {
      console.error(
        "Could not release payment recovery claim:",
        releaseError,
      );
    }
  }
}
