
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  orderUpdateMany: vi.fn(),
  getHeaders: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: mocks.getHeaders,
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: mocks.constructEvent,
    },
    refunds: {
      list: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      updateMany: mocks.orderUpdateMany,
    },
  },
}));

import { POST } from "./route";

describe("Stripe webhook POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_only";

    mocks.getHeaders.mockResolvedValue(
      new Headers({ "stripe-signature": "test-signature" }),
    );

    mocks.constructEvent.mockReturnValue({
      id: "evt_test_001",
      type: "customer.created",
      data: { object: {} },
    });

    mocks.orderUpdateMany.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a request without a Stripe signature", async () => {
    mocks.getHeaders.mockResolvedValue(new Headers());

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.constructEvent).not.toHaveBeenCalled();
  });

  it("rejects an invalid Stripe signature", async () => {
    mocks.constructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.orderUpdateMany).not.toHaveBeenCalled();
  });

  it("acknowledges an unhandled event without touching the database", async () => {
    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(mocks.orderUpdateMany).not.toHaveBeenCalled();
  });

  it("returns an error when a payment-failed database update fails", async () => {
    mocks.constructEvent.mockReturnValue({
      id: "evt_test_failed",
      type: "payment_intent.payment_failed",
      data: {
        object: { id: "pi_test_failed" },
      },
    });

    mocks.orderUpdateMany.mockRejectedValue(
      new Error("Simulated database failure"),
    );

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Webhook handler failed",
    });
  });
});
