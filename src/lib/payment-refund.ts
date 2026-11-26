
export type RefundDecision = "FULL_REFUND" | "PARTIAL_REFUND";

export function getRefundDecision(
  amount: number,
  amountRefunded: number
): RefundDecision {
  if (
    !Number.isSafeInteger(amount) ||
    !Number.isSafeInteger(amountRefunded) ||
    amount <= 0 ||
    amountRefunded < 0 ||
    amountRefunded > amount
  ) {
    throw new Error("Invalid Stripe charge refund amounts");
  }

  return amountRefunded === amount
    ? "FULL_REFUND"
    : "PARTIAL_REFUND";
}
