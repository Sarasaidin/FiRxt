
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  partnerFindUnique: vi.fn(),
  bloodTestPackageFindUnique: vi.fn(),
  clinicPackageFindUnique: vi.fn(),
  stripeCheckoutCreate: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    partner: {
      findUnique: mocks.partnerFindUnique,
    },
    bloodTestPackage: {
      findUnique: mocks.bloodTestPackageFindUnique,
    },
    clinicPackage: {
      findUnique: mocks.clinicPackageFindUnique,
    },
  },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: mocks.stripeCheckoutCreate,
      },
    },
  },
}));

import { POST } from "./route";

const sellingClinic = {
  id: "clinic_selling_1",
  type: "CLINIC",
  status: "APPROVED",
};

const approvedOwnerClinic = {
  id: "clinic_owner_1",
  type: "CLINIC",
  status: "APPROVED",
};

const sharedPackage = {
  id: "package_shared_1",
  name: "Shared Health Screening",
  price: 8990,
  isActive: true,
  approvalStatus: "APPROVED",
  visibility: "SHARED",
  ownerPartnerId: approvedOwnerClinic.id,
  ownerPartner: approvedOwnerClinic,
};

const clinicOffer = {
  id: "clinic_offer_1",
  isAvailable: true,
  priceOverride: null,
};

const defaultItems = [
  {
    id: sharedPackage.id,
    type: "BLOOD_TEST_PACKAGE",
    partnerId: sellingClinic.id,
    quantity: 1,
  },
];

function makeRequest(items = defaultItems) {
  return new Request("http://localhost/api/checkout/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items,
      fulfillmentType: "IN_STORE_PICKUP",
    }),
  });
}

describe("Checkout API - blood-test packages", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getServerSession.mockResolvedValue({
      user: {
        id: "customer_test_1",
      },
    });

    mocks.partnerFindUnique.mockResolvedValue(sellingClinic);

    mocks.bloodTestPackageFindUnique.mockResolvedValue(sharedPackage);

    mocks.clinicPackageFindUnique.mockResolvedValue(clinicOffer);

    mocks.stripeCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.test/session",
    });
  });

  it("allows a shared package when its owner clinic is approved", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: "https://checkout.stripe.test/session",
    });

    expect(mocks.stripeCheckoutCreate).toHaveBeenCalledOnce();
  });

  it("rejects an unauthenticated customer", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(mocks.partnerFindUnique).not.toHaveBeenCalled();
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it("rejects an empty cart", async () => {
    const response = await POST(makeRequest([]));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "Cart is empty",
    });

    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["missing clinic", null],
    ["suspended clinic", { ...sellingClinic, status: "SUSPENDED" }],
    ["non-clinic partner", { ...sellingClinic, type: "PHARMACY" }],
  ])("rejects checkout when the selling clinic is a %s", async (_label, clinic) => {
    mocks.partnerFindUnique.mockResolvedValue(clinic);

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "This clinic is unavailable for checkout.",
    });

    expect(mocks.bloodTestPackageFindUnique).not.toHaveBeenCalled();
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", null],
    ["inactive", { ...sharedPackage, isActive: false }],
    ["pending approval", { ...sharedPackage, approvalStatus: "PENDING" }],
    ["rejected", { ...sharedPackage, approvalStatus: "REJECTED" }],
  ])("rejects a %s package", async (_label, packageData) => {
    mocks.bloodTestPackageFindUnique.mockResolvedValue(packageData);

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "This blood-test package is unavailable.",
    });

    expect(mocks.clinicPackageFindUnique).not.toHaveBeenCalled();
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it("rejects a shared package when its owner clinic is suspended", async () => {
    mocks.bloodTestPackageFindUnique.mockResolvedValue({
      ...sharedPackage,
      ownerPartner: {
        ...approvedOwnerClinic,
        status: "SUSPENDED",
      },
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining("owner clinic is not approved"),
    });

    expect(mocks.clinicPackageFindUnique).not.toHaveBeenCalled();
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it("rejects a shared package when its owner clinic is missing", async () => {
    mocks.bloodTestPackageFindUnique.mockResolvedValue({
      ...sharedPackage,
      ownerPartner: null,
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining("owner clinic is not approved"),
    });

    expect(mocks.clinicPackageFindUnique).not.toHaveBeenCalled();
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it("rejects a shared package when its owner is not a clinic", async () => {
    mocks.bloodTestPackageFindUnique.mockResolvedValue({
      ...sharedPackage,
      ownerPartner: {
        ...approvedOwnerClinic,
        type: "PHARMACY",
      },
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it("allows a private package owned by the selling clinic", async () => {
    const privatePackage = {
      ...sharedPackage,
      id: "package_private_1",
      visibility: "PRIVATE",
      ownerPartnerId: sellingClinic.id,
      ownerPartner: sellingClinic,
    };

    mocks.bloodTestPackageFindUnique.mockResolvedValue(privatePackage);

    const response = await POST(
      makeRequest([
        {
          id: privatePackage.id,
          type: "BLOOD_TEST_PACKAGE",
          partnerId: sellingClinic.id,
          quantity: 1,
        },
      ])
    );

    expect(response.status).toBe(200);
    expect(mocks.stripeCheckoutCreate).toHaveBeenCalledOnce();
  });

  it("rejects a private package purchased through another clinic", async () => {
    const privatePackage = {
      ...sharedPackage,
      visibility: "PRIVATE",
      ownerPartnerId: approvedOwnerClinic.id,
      ownerPartner: approvedOwnerClinic,
    };

    mocks.bloodTestPackageFindUnique.mockResolvedValue(privatePackage);

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "This package is not available through this clinic.",
    });

    expect(mocks.clinicPackageFindUnique).not.toHaveBeenCalled();
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it("rejects a package when the clinic offer is missing", async () => {
    mocks.clinicPackageFindUnique.mockResolvedValue(null);

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "This package is not currently offered by this clinic.",
    });

    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it("rejects a package when the clinic offer is disabled", async () => {
    mocks.clinicPackageFindUnique.mockResolvedValue({
      ...clinicOffer,
      isAvailable: false,
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5])(
    "rejects an invalid package quantity: %s",
    async (quantity) => {
      const response = await POST(
        makeRequest([
          {
            ...defaultItems[0],
            quantity,
          },
        ])
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: "Invalid package quantity.",
      });

      expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
    }
  );

  it("uses the clinic-specific price override during checkout", async () => {
    mocks.clinicPackageFindUnique.mockResolvedValue({
      ...clinicOffer,
      priceOverride: 7500,
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);

    const stripeArguments = mocks.stripeCheckoutCreate.mock.calls[0][0];

    expect(stripeArguments.line_items[0].price_data.unit_amount).toBe(7500);
    expect(stripeArguments.line_items[0].quantity).toBe(1);
  });

  it("uses the package base price when no clinic override exists", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);

    const stripeArguments = mocks.stripeCheckoutCreate.mock.calls[0][0];

    expect(stripeArguments.line_items[0].price_data.unit_amount).toBe(
      sharedPackage.price
    );
  });

  it("rejects a cart containing packages from different selling clinics", async () => {
    const secondClinic = {
      id: "clinic_selling_2",
      type: "CLINIC",
      status: "APPROVED",
    };

    mocks.partnerFindUnique
      .mockResolvedValueOnce(sellingClinic)
      .mockResolvedValueOnce(secondClinic);

    const response = await POST(
      makeRequest([
        ...defaultItems,
        {
          id: "package_shared_2",
          type: "BLOOD_TEST_PACKAGE",
          partnerId: secondClinic.id,
          quantity: 1,
        },
      ])
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "Please checkout items from one merchant at a time.",
    });

    expect(mocks.stripeCheckoutCreate).not.toHaveBeenCalled();
  });

  it("propagates Stripe Checkout creation failures", async () => {
    mocks.stripeCheckoutCreate.mockRejectedValue(
      new Error("Stripe unavailable")
    );

    await expect(POST(makeRequest())).rejects.toThrow("Stripe unavailable");
  });
});
