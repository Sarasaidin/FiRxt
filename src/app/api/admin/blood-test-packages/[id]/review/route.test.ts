
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  transaction: vi.fn(),
  packageFindUnique: vi.fn(),
  packageUpdateMany: vi.fn(),
  partnerFindFirst: vi.fn(),
  clinicPackageUpdateMany: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

import { POST } from "./route";

const pendingPackage = {
  id: "package_test_1",
  approvalStatus: "PENDING",
  isActive: true,
  ownerPartnerId: "clinic_test_1",
};

const approvedPackage = {
  ...pendingPackage,
  approvalStatus: "APPROVED",
  reviewedBy: "admin_test_1",
  reviewedAt: new Date("2026-11-25T02:00:00.000Z"),
  rejectionReason: null,
};

const rejectedPackage = {
  ...pendingPackage,
  approvalStatus: "REJECTED",
  reviewedBy: "admin_test_1",
  reviewedAt: new Date("2026-11-25T02:00:00.000Z"),
  rejectionReason: "Incomplete package information",
};

function makeRequest(body: unknown) {
  return new Request(
    "http://localhost/api/admin/blood-test-packages/package_test_1/review",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
}

const routeContext = {
  params: Promise.resolve({
    id: "package_test_1",
  }),
};

function mockAuthenticatedAdmin() {
  mocks.getServerSession.mockResolvedValue({
    user: {
      id: "admin_test_1",
      role: "ADMIN",
    },
  });
}

function mockTransaction() {
  mocks.transaction.mockImplementation(
    async (
      callback: (tx: unknown) => Promise<unknown>,
    ) =>
      callback({
        bloodTestPackage: {
          findUnique: mocks.packageFindUnique,
          updateMany: mocks.packageUpdateMany,
        },
        partner: {
          findFirst: mocks.partnerFindFirst,
        },
        clinicPackage: {
          updateMany: mocks.clinicPackageUpdateMany,
        },
      }),
  );
}

describe("Admin blood-test package review API", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockAuthenticatedAdmin();
    mockTransaction();

    mocks.packageFindUnique.mockResolvedValue(pendingPackage);

    mocks.packageUpdateMany.mockResolvedValue({
      count: 1,
    });

    mocks.partnerFindFirst.mockResolvedValue({
      id: "clinic_test_1",
    });

    mocks.clinicPackageUpdateMany.mockResolvedValue({
      count: 1,
    });
  });

  describe("POST /api/admin/blood-test-packages/[id]/review", () => {
    it("approves a pending package and enables the owner's clinic offer", async () => {
      mocks.packageFindUnique
        .mockResolvedValueOnce(pendingPackage)
        .mockResolvedValueOnce(approvedPackage);

      const response = await POST(
        makeRequest({ action: "approve" }),
        routeContext,
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe(
        "Blood test package approved successfully",
      );

      expect(mocks.partnerFindFirst).toHaveBeenCalledWith({
        where: {
          id: "clinic_test_1",
          type: "CLINIC",
          status: "APPROVED",
        },
        select: {
          id: true,
        },
      });

      expect(mocks.packageUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "package_test_1",
            isActive: true,
            approvalStatus: "PENDING",
            ownerPartnerId: "clinic_test_1",
          },
          data: expect.objectContaining({
            approvalStatus: "APPROVED",
            reviewedBy: "admin_test_1",
            rejectionReason: null,
          }),
        }),
      );

      expect(mocks.clinicPackageUpdateMany).toHaveBeenCalledWith({
        where: {
          packageId: "package_test_1",
          clinicId: "clinic_test_1",
        },
        data: {
          isAvailable: true,
        },
      });

      expect(mocks.transaction).toHaveBeenCalledWith(
        expect.any(Function),
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    });

    it("rejects a pending package and keeps the owner's clinic offer unavailable", async () => {
      mocks.packageFindUnique
        .mockReset()
        .mockResolvedValueOnce(pendingPackage)
        .mockResolvedValueOnce(rejectedPackage);

      const response = await POST(
        makeRequest({
          action: "reject",
          reason: "Incomplete package information",
        }),
        routeContext,
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe(
        "Blood test package rejected successfully",
      );

      expect(mocks.packageUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            approvalStatus: "REJECTED",
            reviewedBy: "admin_test_1",
            rejectionReason: "Incomplete package information",
          }),
        }),
      );

      expect(mocks.clinicPackageUpdateMany).toHaveBeenCalledWith({
        where: {
          packageId: "package_test_1",
          clinicId: "clinic_test_1",
        },
        data: {
          isAvailable: false,
        },
      });

      expect(mocks.partnerFindFirst).not.toHaveBeenCalled();
    });

    it("rejects unauthenticated requests", async () => {
      mocks.getServerSession.mockResolvedValue(null);

      const response = await POST(
        makeRequest({ action: "approve" }),
        routeContext,
      );

      expect(response.status).toBe(403);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects non-admin users", async () => {
      mocks.getServerSession.mockResolvedValue({
        user: {
          id: "user_test_1",
          role: "CUSTOMER",
        },
      });

      const response = await POST(
        makeRequest({ action: "approve" }),
        routeContext,
      );

      expect(response.status).toBe(403);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects an empty package ID", async () => {
      const response = await POST(
        makeRequest({ action: "approve" }),
        {
          params: Promise.resolve({
            id: " ",
          }),
        },
      );

      expect(response.status).toBe(400);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects malformed JSON requests", async () => {
      const request = new Request(
        "http://localhost/api/admin/blood-test-packages/package_test_1/review",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: "{invalid-json",
        },
      );

      const response = await POST(request, routeContext);

      expect(response.status).toBe(400);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects an invalid review action", async () => {
      const response = await POST(
        makeRequest({ action: "suspend" }),
        routeContext,
      );

      expect(response.status).toBe(400);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("requires a rejection reason", async () => {
      const response = await POST(
        makeRequest({
          action: "reject",
          reason: "   ",
        }),
        routeContext,
      );

      expect(response.status).toBe(400);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects a reason exceeding 1000 characters", async () => {
      const response = await POST(
        makeRequest({
          action: "reject",
          reason: "R".repeat(1001),
        }),
        routeContext,
      );

      expect(response.status).toBe(400);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("rejects approval requests containing a rejection reason", async () => {
      const response = await POST(
        makeRequest({
          action: "approve",
          reason: "Not applicable",
        }),
        routeContext,
      );

      expect(response.status).toBe(400);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("returns 404 when the package does not exist", async () => {
      mocks.packageFindUnique.mockResolvedValue(null);

      const response = await POST(
        makeRequest({ action: "approve" }),
        routeContext,
      );

      expect(response.status).toBe(404);
      expect(mocks.packageUpdateMany).not.toHaveBeenCalled();
    });

    it("rejects packages that are no longer pending", async () => {
      mocks.packageFindUnique.mockResolvedValue({
        ...pendingPackage,
        approvalStatus: "APPROVED",
      });

      const response = await POST(
        makeRequest({ action: "approve" }),
        routeContext,
      );

      expect(response.status).toBe(409);
      expect(mocks.packageUpdateMany).not.toHaveBeenCalled();
    });

    it("rejects inactive packages", async () => {
      mocks.packageFindUnique.mockResolvedValue({
        ...pendingPackage,
        isActive: false,
      });

      const response = await POST(
        makeRequest({ action: "approve" }),
        routeContext,
      );

      expect(response.status).toBe(409);
      expect(mocks.packageUpdateMany).not.toHaveBeenCalled();
    });

    it("rejects packages without an owning clinic", async () => {
      mocks.packageFindUnique.mockResolvedValue({
        ...pendingPackage,
        ownerPartnerId: null,
      });

      const response = await POST(
        makeRequest({ action: "approve" }),
        routeContext,
      );

      expect(response.status).toBe(409);
      expect(mocks.packageUpdateMany).not.toHaveBeenCalled();
    });

    it("prevents approval when the owning clinic is not approved", async () => {
      mocks.partnerFindFirst.mockResolvedValue(null);

      const response = await POST(
        makeRequest({ action: "approve" }),
        routeContext,
      );

      expect(response.status).toBe(409);
      expect(mocks.packageUpdateMany).not.toHaveBeenCalled();
      expect(mocks.clinicPackageUpdateMany).not.toHaveBeenCalled();
    });

    it("returns 409 when another administrator has already reviewed the package", async () => {
      mocks.packageUpdateMany.mockResolvedValue({
        count: 0,
      });

      const response = await POST(
        makeRequest({ action: "approve" }),
        routeContext,
      );

      expect(response.status).toBe(409);
      expect(mocks.clinicPackageUpdateMany).not.toHaveBeenCalled();
    });

    it("returns 409 when Prisma reports a serializable transaction conflict", async () => {
      mocks.transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(
          "Transaction conflict",
          {
            code: "P2034",
            clientVersion: "6.19.3",
          },
        ),
      );

      const response = await POST(
        makeRequest({ action: "approve" }),
        routeContext,
      );

      expect(response.status).toBe(409);
    });

    it("returns 500 when the database transaction fails", async () => {
      mocks.transaction.mockRejectedValue(
        new Error("Database unavailable"),
      );

      const response = await POST(
        makeRequest({ action: "approve" }),
        routeContext,
      );

      expect(response.status).toBe(500);
    });
  });
});
