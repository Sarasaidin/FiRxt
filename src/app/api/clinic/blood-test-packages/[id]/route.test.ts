
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  getPartnerContext: vi.fn(),
  partnerFindFirst: vi.fn(),
  packageFindFirst: vi.fn(),
  labTestFindMany: vi.fn(),
  packageUpdateMany: vi.fn(),
  packageUpdate: vi.fn(),
  clinicPackageUpdateMany: vi.fn(),
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
      findFirst: mocks.packageFindFirst,
    },
    $transaction: mocks.transaction,
  },
}));

import { DELETE, PATCH } from "./route";

const clinic = {
  id: "clinic_test_1",
};

const packageId = "package_test_1";

const existingPackage = {
  id: packageId,
  price: 8990,
  originalPrice: 12000,
  approvalStatus: "PENDING",
  isActive: true,
};

const updatedPackage = {
  id: packageId,
  name: "Updated Blood Test Package",
  price: 9500,
  approvalStatus: "PENDING",
  packageTests: [],
};

function makeRequest(body?: unknown) {
  return new Request(
    `http://localhost/api/clinic/blood-test-packages/${packageId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }
  );
}

function makeContext(id = packageId) {
  return {
    params: Promise.resolve({ id }),
  };
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
    async (
      callback: (tx: unknown) => Promise<unknown>
    ) =>
      callback({
        labTest: {
          findMany: mocks.labTestFindMany,
        },
        bloodTestPackage: {
          updateMany: mocks.packageUpdateMany,
          update: mocks.packageUpdate,
        },
        clinicPackage: {
          updateMany: mocks.clinicPackageUpdateMany,
        },
      })
  );
}

describe("Clinic blood-test package [id] API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockAuthenticatedClinic();

    mocks.packageFindFirst.mockResolvedValue(existingPackage);

    mocks.labTestFindMany.mockResolvedValue([
      { id: "lab_test_1" },
      { id: "lab_test_2" },
    ]);

    mocks.packageUpdateMany.mockResolvedValue({
      count: 1,
    });

    mocks.packageUpdate.mockResolvedValue(updatedPackage);

    mocks.clinicPackageUpdateMany.mockResolvedValue({
      count: 1,
    });

    mockTransaction();
  });

  describe("PATCH /api/clinic/blood-test-packages/[id]", () => {
    it("updates a package and resubmits it for approval", async () => {
      const response = await PATCH(
        makeRequest({
          name: "Updated Blood Test Package",
          price: 9500,
        }),
        makeContext()
      );

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body.message).toContain(
        "submitted for administrator approval"
      );

      expect(mocks.packageUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: packageId,
            ownerPartnerId: clinic.id,
            isActive: true,
            approvalStatus: {
              in: ["PENDING", "REJECTED"],
            },
          }),
          data: expect.objectContaining({
            approvalStatus: "PENDING",
            reviewedBy: null,
            reviewedAt: null,
            rejectionReason: null,
          }),
        })
      );

      expect(mocks.packageUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: packageId },
          data: expect.objectContaining({
            name: "Updated Blood Test Package",
            price: 9500,
            approvalStatus: "PENDING",
            reviewedBy: null,
            reviewedAt: null,
            rejectionReason: null,
          }),
        })
      );

      expect(mocks.clinicPackageUpdateMany).toHaveBeenCalledWith({
        where: {
          clinicId: clinic.id,
          packageId,
        },
        data: {
          isAvailable: false,
        },
      });
    });

    it("allows rejected packages to be edited and resubmitted", async () => {
      mocks.packageFindFirst.mockResolvedValue({
        ...existingPackage,
        approvalStatus: "REJECTED",
    });

    const response = await PATCH(
      makeRequest({
        name: "Revised Blood Test Package",
      }),
      makeContext()
    );

    expect(response.status).toBe(200);

    expect(mocks.packageUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          approvalStatus: {
            in: ["PENDING", "REJECTED"],
          },
        }),
        data: {
          approvalStatus: "PENDING",
          reviewedBy: null,
          reviewedAt: null,
          rejectionReason: null,
        },
      })
    );
  });

    it("rejects unauthenticated requests", async () => {
      mocks.getPartnerContext.mockResolvedValue(null);

      const response = await PATCH(
        makeRequest({ name: "Updated Package" }),
        makeContext()
      );

      expect(response.status).toBe(401);
      expect(mocks.packageFindFirst).not.toHaveBeenCalled();
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects requests without an active clinic", async () => {
      mocks.getPartnerContext.mockResolvedValue({
        userId: "user_test_1",
        activePartner: null,
        partners: [],
      });

      const response = await PATCH(
        makeRequest({ name: "Updated Package" }),
        makeContext()
      );

      expect(response.status).toBe(400);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects a partner that is not an approved clinic", async () => {
      mocks.partnerFindFirst.mockResolvedValue(null);

      const response = await PATCH(
        makeRequest({ name: "Updated Package" }),
        makeContext()
      );

      expect(response.status).toBe(403);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects an empty package ID", async () => {
      const response = await PATCH(
        makeRequest({ name: "Updated Package" }),
        makeContext(" ")
      );

      expect(response.status).toBe(400);
      expect(mocks.packageFindFirst).not.toHaveBeenCalled();
    });

    it("rejects invalid JSON", async () => {
      const request = new Request(
        `http://localhost/api/clinic/blood-test-packages/${packageId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: "{invalid-json",
        }
      );

      const response = await PATCH(request, makeContext());

      expect(response.status).toBe(400);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects invalid package details", async () => {
      const response = await PATCH(
        makeRequest({ price: -100 }),
        makeContext()
      );

      expect(response.status).toBe(400);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects packages not owned by the selected clinic", async () => {
      mocks.packageFindFirst.mockResolvedValue(null);

      const response = await PATCH(
        makeRequest({ name: "Updated Package" }),
        makeContext()
      );

      expect(response.status).toBe(404);
      expect(mocks.packageFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: packageId,
            ownerPartnerId: clinic.id,
          },
        })
      );

      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects inactive packages", async () => {
      mocks.packageFindFirst.mockResolvedValue({
        ...existingPackage,
        isActive: false,
      });

      const response = await PATCH(
        makeRequest({ name: "Updated Package" }),
        makeContext()
      );

      expect(response.status).toBe(409);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects packages that are already approved", async () => {
      mocks.packageFindFirst.mockResolvedValue({
        ...existingPackage,
        approvalStatus: "APPROVED",
      });

      const response = await PATCH(
        makeRequest({ name: "Updated Package" }),
        makeContext()
      );

      expect(response.status).toBe(409);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects an original price that is not greater than the final price", async () => {
      const response = await PATCH(
        makeRequest({ price: 13000 }),
        makeContext()
    );

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects nonexistent or inactive laboratory tests", async () => {
      mocks.labTestFindMany.mockResolvedValue([
        { id: "lab_test_1" },
      ]);

      const response = await PATCH(
        makeRequest({
          labTestIds: ["lab_test_1", "lab_test_2"],
        }),
        makeContext()
      );

      expect(response.status).toBe(400);
      expect(mocks.packageUpdate).not.toHaveBeenCalled();
      expect(mocks.clinicPackageUpdateMany).not.toHaveBeenCalled();
    });

    it("does not update when the atomic package claim fails", async () => {
      mocks.packageUpdateMany.mockResolvedValue({
        count: 0,
      });

      const response = await PATCH(
        makeRequest({ name: "Updated Package" }),
        makeContext()
      );

      expect(response.status).toBe(409);
      expect(mocks.packageUpdate).not.toHaveBeenCalled();
      expect(mocks.clinicPackageUpdateMany).not.toHaveBeenCalled();
    });

    it("replaces laboratory test associations when test IDs are supplied", async () => {
      const response = await PATCH(
        makeRequest({
          labTestIds: ["lab_test_1", "lab_test_2"],
        }),
        makeContext()
      );

      expect(response.status).toBe(200);

      expect(mocks.packageUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            packageTests: {
              deleteMany: {},
              create: [
                {
                  labTest: {
                    connect: {
                      id: "lab_test_1",
                    },
                  },
                  sortOrder: 0,
                },
                {
                  labTest: {
                    connect: {
                      id: "lab_test_2",
                    },
                  },
                  sortOrder: 1,
                },
              ],
            },
          }),
        })
      );
    });

    it("uses a serializable transaction", async () => {
      await PATCH(
        makeRequest({ name: "Updated Package" }),
        makeContext()
      );

      expect(mocks.transaction).toHaveBeenCalledWith(
        expect.any(Function),
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        }
      );
    });

    it("returns 409 when a concurrent transaction conflict occurs", async () => {
      mocks.transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(
          "Transaction conflict",
          {
            code: "P2034",
            clientVersion: "test",
          }
        )
      );

      const response = await PATCH(
        makeRequest({ name: "Updated Package" }),
        makeContext()
      );

      expect(response.status).toBe(409);
    });

    it("returns 500 when an unexpected database error occurs", async () => {
      mocks.transaction.mockRejectedValue(
        new Error("Database unavailable")
      );

      const response = await PATCH(
        makeRequest({ name: "Updated Package" }),
        makeContext()
      );

      expect(response.status).toBe(500);
    });
  });

  describe("DELETE /api/clinic/blood-test-packages/[id]", () => {
    it("soft-deactivates the package and disables all clinic offers", async () => {
      const response = await DELETE(
        new Request(
          `http://localhost/api/clinic/blood-test-packages/${packageId}`,
          { method: "DELETE" }
        ),
        makeContext()
      );

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body.message).toContain(
        "Historical orders and records have been preserved"
      );

      expect(mocks.packageUpdateMany).toHaveBeenCalledWith({
        where: {
          id: packageId,
          ownerPartnerId: clinic.id,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      expect(mocks.clinicPackageUpdateMany).toHaveBeenCalledWith({
        where: {
          packageId,
        },
        data: {
          isAvailable: false,
        },
      });
    });

    it("rejects unauthenticated requests", async () => {
      mocks.getPartnerContext.mockResolvedValue(null);

      const response = await DELETE(
        new Request("http://localhost/test", {
          method: "DELETE",
        }),
        makeContext()
      );

      expect(response.status).toBe(401);
      expect(mocks.packageFindFirst).not.toHaveBeenCalled();
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects a clinic that is not approved", async () => {
      mocks.partnerFindFirst.mockResolvedValue(null);

      const response = await DELETE(
        new Request("http://localhost/test", {
          method: "DELETE",
        }),
        makeContext()
      );

      expect(response.status).toBe(403);
      expect(mocks.packageFindFirst).not.toHaveBeenCalled();
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects requests without an active clinic", async () => {
      mocks.getPartnerContext.mockResolvedValue({
        userId: "user_test_1",
        activePartner: null,
        partners: [],
      });

      const response = await DELETE(
        new Request("http://localhost/test", {
          method: "DELETE",
        }),
        makeContext()
      );

      expect(response.status).toBe(400);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects an empty package ID", async () => {
      const response = await DELETE(
        new Request("http://localhost/test", {
          method: "DELETE",
        }),
        makeContext(" ")
      );

      expect(response.status).toBe(400);
      expect(mocks.packageFindFirst).not.toHaveBeenCalled();
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects packages not owned by the selected clinic", async () => {
      mocks.packageFindFirst.mockResolvedValue(null);

      const response = await DELETE(
        new Request("http://localhost/test", {
          method: "DELETE",
        }),
        makeContext()
      );

      expect(response.status).toBe(404);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects packages that are already inactive", async () => {
      mocks.packageFindFirst.mockResolvedValue({
        id: packageId,
        isActive: false,
      });

      const response = await DELETE(
        new Request("http://localhost/test", {
          method: "DELETE",
        }),
        makeContext()
      );

      expect(response.status).toBe(409);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("returns 409 when the package was already changed", async () => {
      mocks.packageUpdateMany.mockResolvedValue({
        count: 0,
      });

      const response = await DELETE(
        new Request("http://localhost/test", {
          method: "DELETE",
        }),
        makeContext()
      );

      expect(response.status).toBe(409);
      expect(mocks.clinicPackageUpdateMany).not.toHaveBeenCalled();
    });

    it("uses a serializable transaction", async () => {
      await DELETE(
        new Request("http://localhost/test", {
          method: "DELETE",
        }),
        makeContext()
      );

      expect(mocks.transaction).toHaveBeenCalledWith(
        expect.any(Function),
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        }
      );
    });

    it("returns 409 when a concurrent transaction conflict occurs", async () => {
      mocks.transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(
          "Transaction conflict",
          {
            code: "P2034",
            clientVersion: "test",
          }
        )
      );

      const response = await DELETE(
        new Request("http://localhost/test", {
          method: "DELETE",
        }),
        makeContext()
      );

      expect(response.status).toBe(409);
    });

    it("returns 500 when an unexpected database error occurs", async () => {
      mocks.transaction.mockRejectedValue(
        new Error("Database unavailable")
      );

      const response = await DELETE(
        new Request("http://localhost/test", {
          method: "DELETE",
        }),
        makeContext()
      );

      expect(response.status).toBe(500);
    });
  });
});
