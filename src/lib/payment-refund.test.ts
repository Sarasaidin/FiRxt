
import { describe, expect, it } from "vitest";
import { getRefundDecision } from "./payment-refund";

describe("getRefundDecision", () => {
  it("recognizes a full refund", () => {
    expect(getRefundDecision(10000, 10000)).toBe("FULL_REFUND");
  });

  it("recognizes a partial refund", () => {
    expect(getRefundDecision(10000, 3000)).toBe("PARTIAL_REFUND");
  });

  it("does not treat zero refunded as a full refund", () => {
    expect(getRefundDecision(10000, 0)).toBe("PARTIAL_REFUND");
  });

  it("rejects a refund larger than the charge", () => {
    expect(() => getRefundDecision(10000, 12000)).toThrow();
  });

  it("rejects invalid amounts", () => {
    expect(() => getRefundDecision(0, 0)).toThrow();
    expect(() => getRefundDecision(10000, -1)).toThrow();
    expect(() => getRefundDecision(10.5, 5)).toThrow();
  });
});
