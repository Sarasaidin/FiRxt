
import { describe, expect, it } from "vitest";
import { withPaymentRecoveryLock } from "./payment-recovery-lock";

describe("withPaymentRecoveryLock", () => {
  it("allows a recovery operation to complete", async () => {
    const result = await withPaymentRecoveryLock("cs_test_1", async () => "ok");

    expect(result).toEqual({ acquired: true, result: "ok" });
  });

  it("rejects overlapping work for the same session", async () => {
    let release!: () => void;

    const first = withPaymentRecoveryLock("cs_test_2", () =>
      new Promise<string>((resolve) => {
        release = () => resolve("first");
      })
    );

    // Allow the first operation to acquire the lock.
    await Promise.resolve();

    const second = await withPaymentRecoveryLock(
      "cs_test_2",
      async () => "second"
    );

    expect(second).toEqual({ acquired: false });

    release();
    expect(await first).toEqual({ acquired: true, result: "first" });
  });

  it("releases the lock after an operation fails", async () => {
    await expect(
      withPaymentRecoveryLock("cs_test_3", async () => {
        throw new Error("test failure");
      })
    ).rejects.toThrow("test failure");

    const retry = await withPaymentRecoveryLock(
      "cs_test_3",
      async () => "retry"
    );

    expect(retry).toEqual({ acquired: true, result: "retry" });
  });
});
