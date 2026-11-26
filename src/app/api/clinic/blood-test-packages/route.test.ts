
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPartnerContext: vi.fn(),
  partnerFindFirst: vi.fn(),
  packageFindMany: vi.fn(),
  labTestFindMany: vi.fn(),
  packageCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/active-partner", () => ({
  getPartnerContext: mocks.getPartnerContext,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    partner: {
      findFirst: mocks.partnerFindFirst,
    },
    bloodTestPackage: {
      findMany: mocks.packageFindMany,
    },
    labTest: {
      findMany: mocks.labTestFindMany,
    },
    $transaction: mocks.transaction,
  },
}));

import { GET, POST } from "./route";

const clinic = {
  id: "clinic_test_1",
  name: "Test Clinic",
  slug: "test-clinic",
};

const validPackage = {
  name: "Complete Blood Test",
  description: "A complete blood test package",
  price: 8990,
  originalPrice: 12000,
  preparationInstructions: "Fast for 8 hours before testing.",
  sampleType: "Blood",
  turnaroundDays: 3,
  visibility: "PRIVATE",
  labTestIds: ["lab_test_1", "lab_test_2"],
};

function makeRequest(body: unknown) {
  return new Request(
    "http://localhost/api/clinic/blood-test-packages",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
}

function mockAuthenticatedClinic() {
  mocks.getPartnerContext.mockResolvedValue({
    userId: "user_test_1",
    activePartner: {
      id: clinic.id,
      type: "CLINIC",
      status: "APPROVED",
    },
    partners: [],
  });

  mocks.partnerFindFirst.mockResolvedValue(clinic);
}

function mockTransaction() {
  mocks.transaction.mockImplementation(
    async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        labTest: {
          findMany: mocks.labTestFindMany,
        },
        bloodTestPackage: {
          create: mocks.packageCreate,
        },
      })
  );
}

describe("Clinic blood-test packages API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockAuthenticatedClinic();

    mocks.packageFindMany.mockResolvedValue([]);
    mocks.labTestFindMany.mockResolvedValue([
      { id: "lab_test_1" },
      { id: "lab_test_2" },
    ]);

    mocks.packageCreate.mockResolvedValue({
      id: "package_test_1",
      name: "Complete Blood Test",
      price: 8990,
      approvalStatus: "PENDING",
      visibility: "PRIVATE",
      isActive: true,
      packageTests: [],
      clinicLinks: [
        {
          clinicId: clinic.id,
          isAvailable: false,
        },
      ],
    });

    mockTransaction();
  });

  describe("GET /api/clinic/blood-test-packages", () => {
    it("returns packages owned by the selected clinic", async () => {
      mocks.packageFindMany.mockResolvedValue([
        {
          id: "package_test_1",
          name: "Complete Blood Test",
          ownerPartnerId: clinic.id,
        },
      ]);

      const response = await GET();

      expect(response.status).toBe(200);
      expect(await response.json()).toHaveProperty("packages");

      expect(mocks.packageFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            ownerPartnerId: clinic.id,
          },
        })
      );
    });

    it("rejects unauthenticated requests", async () => {
      mocks.getPartnerContext.mockResolvedValue(null);

      const response = await GET();

      expect(response.status).toBe(401);
      expect(mocks.packageFindMany).not.toHaveBeenCalled();
    });

    it("rejects requests without an active clinic", async () => {
      mocks.getPartnerContext.mockResolvedValue({
        userId: "user_test_1",
        activePartner: null,
        partners: [],
      });

      const response = await GET();

      expect(response.status).toBe(400);
      expect(mocks.packageFindMany).not.toHaveBeenCalled();
    });

    it("rejects a partner that is not an approved clinic", async () => {
      mocks.partnerFindFirst.mockResolvedValue(null);

      const response = await GET();

      expect(response.status).toBe(403);
      expect(mocks.packageFindMany).not.toHaveBeenCalled();
    });

    it("returns 500 when package retrieval fails", async () => {
      mocks.packageFindMany.mockRejectedValue(
        new Error("Database unavailable")
      );

      const response = await GET();

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/clinic/blood-test-packages", () => {
    it("creates a package with pending approval and unavailable owner offer", async () => {
      const response = await POST(makeRequest(validPackage));

      expect(response.status).toBe(201);

      expect(mocks.transaction).toHaveBeenCalledOnce();
      expect(mocks.labTestFindMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: validPackage.labTestIds,
          },
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      expect(mocks.packageCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerPartnerId: clinic.id,
            approvalStatus: "PENDING",
            visibility: "PRIVATE",
            isActive: true,
            clinicLinks: {
              create: {
                clinicId: clinic.id,
                priceOverride: null,
                isAvailable: false,
              },
            },
          }),
        })
      );
    });

    it("verifies clinic ownership against the authenticated user", async () => {
      await POST(makeRequest(validPackage));

      expect(mocks.partnerFindFirst).toHaveBeenCalledWith({
        where: {
          id: clinic.id,
          userId: "user_test_1",
          type: "CLINIC",
          status: "APPROVED",
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });
    });

    it("rejects unauthenticated requests", async () => {
      mocks.getPartnerContext.mockResolvedValue(null);

      const response = await POST(makeRequest(validPackage));

      expect(response.status).toBe(401);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects a partner that is not an approved clinic", async () => {
      mocks.partnerFindFirst.mockResolvedValue(null);

      const response = await POST(makeRequest(validPackage));

      expect(response.status).toBe(403);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects invalid package details", async () => {
      const response = await POST(
        makeRequest({
          ...validPackage,
          name: "A",
          price: -100,
        })
      );

      expect(response.status).toBe(400);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects unsupported server-controlled fields", async () => {
      const response = await POST(
        makeRequest({
          ...validPackage,
          approvalStatus: "APPROVED",
          ownerPartnerId: "another_clinic",
          isActive: false,
        })
      );

      expect(response.status).toBe(400);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects duplicate laboratory test IDs", async () => {
      const response = await POST(
        makeRequest({
          ...validPackage,
          labTestIds: ["lab_test_1", "lab_test_1"],
        })
      );

      expect(response.status).toBe(400);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects unavailable or nonexistent laboratory tests", async () => {
      mocks.labTestFindMany.mockResolvedValue([
        { id: "lab_test_1" },
      ]);

      const response = await POST(makeRequest(validPackage));

      expect(response.status).toBe(400);
      expect(mocks.packageCreate).not.toHaveBeenCalled();
    });

    it("returns 500 when laboratory test validation fails", async () => {
      mocks.labTestFindMany.mockRejectedValue(
        new Error("Laboratory test lookup failed")
      );

      const response = await POST(makeRequest(validPackage));

      expect(response.status).toBe(500);
      expect(mocks.packageCreate).not.toHaveBeenCalled();
    });

    it("returns 500 when package creation fails", async () => {
      mocks.packageCreate.mockRejectedValue(
        new Error("Database write failed")
      );

      const response = await POST(makeRequest(validPackage));

      expect(response.status).toBe(500);
    });
  });
});
