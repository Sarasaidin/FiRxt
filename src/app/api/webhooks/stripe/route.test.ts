
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  getHeaders: vi.fn(),

  listLineItems: vi.fn(),
  recoverPaidCheckout: vi.fn(),
  generateOrderNumber: vi.fn(),
  generateVisitNumber: vi.fn(),

  orderFindUnique: vi.fn(),
  orderUpdateMany: vi.fn(),
  transaction: vi.fn(),

  txOrderFindUnique: vi.fn(),
  partnerFindUnique: vi.fn(),
  bloodTestPackageFindUnique: vi.fn(),
  clinicPackageFindUnique: vi.fn(),
  orderCreate: vi.fn(),
  clinicVisitUpsert: vi.fn(),

  productUpdateMany: vi.fn(),
  promotionFindUnique: vi.fn(),
  promotionUpdate: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: mocks.getHeaders,
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: mocks.constructEvent,
    },
    checkout: {
      sessions: {
        listLineItems: mocks.listLineItems,
      },
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
      findUnique: mocks.orderFindUnique,
      updateMany: mocks.orderUpdateMany,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/utils", () => ({
  generateOrderNumber: mocks.generateOrderNumber,
  generateVisitNumber: mocks.generateVisitNumber,
}));

vi.mock("@/lib/payment-recovery", () => ({
  recoverPaidCheckout: mocks.recoverPaidCheckout,
}));

import { POST } from "./route";

const packageId = "package_test_001";
const partnerId = "clinic_test_001";
const sessionId = "cs_test_package_001";

function createCheckoutEvent() {
  return {
    id: "evt_checkout_test",
    type: "checkout.session.completed",
    data: {
      object: {
        id: sessionId,
        mode: "payment",
        payment_status: "paid",
        currency: "myr",
        amount_subtotal: 15000,
        amount_total: 15000,
        payment_intent: "pi_test_package",
        metadata: {
          userId: "user_test_001",
          partnerId,
          fulfillmentType: "IN_STORE_VISIT",
        },
      },
    },
  };
}

function createPackageLineItem() {
  return {
    quantity: 1,
    currency: "myr",
    amount_subtotal: 15000,
    price: {
      unit_amount: 15000,
      product: {
        id: "stripe_product_test",
        metadata: {
          type: "BLOOD_TEST_PACKAGE",
          bloodTestPackageId: packageId,
        },
      },
    },
  };
}

function createBloodTestPackage() {
  return {
    id: packageId,
    name: "Complete Health Screening",
    isActive: true,
    approvalStatus: "APPROVED",
    visibility: "PUBLIC",
    ownerPartnerId: partnerId,
    preparationInstructions: "Fast for 8 hours before the test.",
    packageTests: [
      {
        labTestId: "lab_test_001",
        notes: "Required",
        sortOrder: 1,
        labTest: {
          id: "lab_test_001",
          code: "FBC",
          name: "Full Blood Count",
          description: "Measures blood cell components.",
          category: "Haematology",
        },
      },
    ],
  };
}

function createTransactionContext() {
  return {
    order: {
      findUnique: mocks.txOrderFindUnique,
      create: mocks.orderCreate,
    },
    partner: {
      findUnique: mocks.partnerFindUnique,
    },
    bloodTestPackage: {
      findUnique: mocks.bloodTestPackageFindUnique,
    },
    clinicPackage: {
      findUnique: mocks.clinicPackageFindUnique,
    },
    clinicVisit: {
      upsert: mocks.clinicVisitUpsert,
    },
    product: {
      updateMany: mocks.productUpdateMany,
    },
    promotion: {
      findUnique: mocks.promotionFindUnique,
      update: mocks.promotionUpdate,
    },
  };
}

async function sendWebhook() {
  return POST(
    new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: "{}",
    }),
  );
}

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

    mocks.orderFindUnique.mockResolvedValue(null);
    mocks.orderUpdateMany.mockResolvedValue({ count: 0 });

    mocks.txOrderFindUnique.mockResolvedValue(null);

    mocks.partnerFindUnique.mockResolvedValue({
      id: partnerId,
      type: "CLINIC",
      status: "APPROVED",
    });

    mocks.bloodTestPackageFindUnique.mockResolvedValue(
      createBloodTestPackage(),
    );

    mocks.clinicPackageFindUnique.mockResolvedValue({
      isAvailable: true,
    });

    mocks.orderCreate.mockResolvedValue({
      id: "order_test_001",
    });

    mocks.clinicVisitUpsert.mockResolvedValue({
      id: "clinic_visit_test_001",
    });

    mocks.productUpdateMany.mockResolvedValue({ count: 1 });

    mocks.promotionFindUnique.mockResolvedValue(null);
    mocks.promotionUpdate.mockResolvedValue({});

    mocks.listLineItems.mockResolvedValue({
      has_more: false,
      data: [createPackageLineItem()],
    });

    mocks.generateOrderNumber.mockReturnValue("ORD-TEST-001");
    mocks.generateVisitNumber.mockReturnValue("VIS-TEST-001");

    mocks.recoverPaidCheckout.mockResolvedValue(undefined);

    mocks.transaction.mockImplementation(async (callback) => {
      return callback(createTransactionContext());
    });
  });

  it("recovers a paid checkout when the selling clinic is no longer approved", async () => {
    mocks.constructEvent.mockReturnValue(createCheckoutEvent());

    mocks.partnerFindUnique.mockResolvedValue({
      id: partnerId,
      type: "CLINIC",
      status: "SUSPENDED",
    });

    const response = await sendWebhook();

    expect(response.status).toBe(200);
    expect(mocks.orderCreate).not.toHaveBeenCalled();

    expect(mocks.recoverPaidCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ id: sessionId }),
      expect.stringContaining("not an approved clinic"),
    );
  });

  it("recovers a paid checkout when the clinic package offer is disabled", async () => {
    mocks.constructEvent.mockReturnValue(createCheckoutEvent());

    mocks.clinicPackageFindUnique.mockResolvedValue({
      isAvailable: false,
    });

    const response = await sendWebhook();

    expect(response.status).toBe(200);
    expect(mocks.orderCreate).not.toHaveBeenCalled();

    expect(mocks.recoverPaidCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ id: sessionId }),
      expect.stringContaining("no longer offered by this clinic"),
    );
  });

  it("recovers a paid checkout when a private package is purchased through another clinic", async () => {
    mocks.constructEvent.mockReturnValue(createCheckoutEvent());

    mocks.bloodTestPackageFindUnique.mockResolvedValue({
      ...createBloodTestPackage(),
      visibility: "PRIVATE",
      ownerPartnerId: "different_owner_clinic",
    });

    const response = await sendWebhook();

    expect(response.status).toBe(200);
    expect(mocks.clinicPackageFindUnique).not.toHaveBeenCalled();
    expect(mocks.orderCreate).not.toHaveBeenCalled();

    expect(mocks.recoverPaidCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ id: sessionId }),
      expect.stringContaining("not available through this clinic"),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });


  it("rejects a request without a Stripe signature", async () => {
    mocks.getHeaders.mockResolvedValue(new Headers());

    const response = await sendWebhook();

    expect(response.status).toBe(400);
    expect(mocks.constructEvent).not.toHaveBeenCalled();
  });

  it("rejects an invalid Stripe signature", async () => {
    mocks.constructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const response = await sendWebhook();

    expect(response.status).toBe(400);
    expect(mocks.orderUpdateMany).not.toHaveBeenCalled();
  });

  it("acknowledges an unhandled event without touching the database", async () => {
    const response = await sendWebhook();

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

    const response = await sendWebhook();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Webhook handler failed",
    });
  });

  it("creates a paid order with blood-test package snapshots and a clinic visit", async () => {
    mocks.constructEvent.mockReturnValue(createCheckoutEvent());

    const response = await sendWebhook();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });

    expect(mocks.listLineItems).toHaveBeenCalledWith(sessionId, {
      limit: 100,
      expand: ["data.price.product"],
    });

    expect(mocks.orderCreate).toHaveBeenCalledTimes(1);

    const orderCreateCall = mocks.orderCreate.mock.calls[0][0];

    expect(orderCreateCall.data).toMatchObject({
      orderNumber: "ORD-TEST-001",
      userId: "user_test_001",
      partnerId,
      status: "BOOKING_CONFIRMED",
      paymentStatus: "PAID",
      fulfillmentType: "IN_STORE_VISIT",
      subtotal: 15000,
      total: 15000,
      stripeSessionId: sessionId,
      stripePaymentIntentId: "pi_test_package",
    });

    expect(orderCreateCall.data.items.create).toEqual([
      expect.objectContaining({
        bloodTestPackage: {
          connect: { id: packageId },
        },
        quantity: 1,
        unitPrice: 15000,
        totalPrice: 15000,
        itemType: "BLOOD_TEST_PACKAGE",
        packageNameSnapshot: "Complete Health Screening",
        preparationInstructionsSnapshot:
          "Fast for 8 hours before the test.",
        includedTestsSnapshot: [
          {
            labTestId: "lab_test_001",
            code: "FBC",
            name: "Full Blood Count",
            description: "Measures blood cell components.",
            category: "Haematology",
            notes: "Required",
            sortOrder: 1,
          },
        ],
      }),
    ]);

    expect(mocks.clinicVisitUpsert).toHaveBeenCalledWith({
      where: { orderId: "order_test_001" },
      update: {},
      create: {
        visitNumber: "VIS-TEST-001",
        orderId: "order_test_001",
        status: "REGISTERED",
      },
    });

    expect(mocks.productUpdateMany).not.toHaveBeenCalled();
    expect(mocks.recoverPaidCheckout).not.toHaveBeenCalled();
  });

  it("does not create a duplicate order when the Stripe session already exists", async () => {
    mocks.constructEvent.mockReturnValue(createCheckoutEvent());

    mocks.orderFindUnique.mockResolvedValue({
      id: "order_existing_001",
    });

    mocks.txOrderFindUnique.mockResolvedValue({
      id: "order_existing_001",
      paymentStatus: "PAID",
      fulfillmentType: "IN_STORE_VISIT",
      partner: {
        type: "CLINIC",
      },
      items: [
        {
          itemType: "BLOOD_TEST_PACKAGE",
        },
      ],
    });

    const response = await sendWebhook();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });

    expect(mocks.orderCreate).not.toHaveBeenCalled();
    expect(mocks.listLineItems).not.toHaveBeenCalled();

    expect(mocks.clinicVisitUpsert).toHaveBeenCalledWith({
      where: { orderId: "order_existing_001" },
      update: {},
      create: {
        visitNumber: "VIS-TEST-001",
        orderId: "order_existing_001",
        status: "REGISTERED",
      },
    });
  });

  it("recovers a paid checkout when the blood-test package is unavailable", async () => {
    mocks.constructEvent.mockReturnValue(createCheckoutEvent());

    mocks.bloodTestPackageFindUnique.mockResolvedValue(null);

    const response = await sendWebhook();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });

    expect(mocks.orderCreate).not.toHaveBeenCalled();

    expect(mocks.recoverPaidCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        id: sessionId,
        payment_status: "paid",
      }),
      expect.stringContaining("unavailable or invalid"),
    );
  });
});
