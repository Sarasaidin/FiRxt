
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  packageFindUnique: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    bloodTestPackage: {
      findUnique: mocks.packageFindUnique,
    },
  },
}));

import { GET } from "./route";

function makeContext(id = "package_test_1") {
  return {
    params: Promise.resolve({ id }),
  };
}

function makeRequest() {
  return new Request(
    "http://localhost/api/admin/blood-test-packages/package_test_1"
  );
}

const packageDetails = {
  id: "package_test_1",
  name: "Complete Blood Test",
  price: 8990,
  approvalStatus: "PENDING",
  ownerPartner: {
    id: "clinic_test_1",
    name: "Test Clinic",
    type: "CLINIC",
  },
  packageTests: [
    {
      id: "package_test_link_1",
      labTest: {
        id: "lab_test_1",
        code: "CBC",
        name: "Full Blood Count",
      },
    },
  ],
};

function mockAuthenticatedAdmin() {
  mocks.getServerSession.mockResolvedValue({
    user: {
      id: "admin_test_1",
      role: "ADMIN",
    },
  });
}

describe("Admin blood-test package detail API", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockAuthenticatedAdmin();
    mocks.packageFindUnique.mockResolvedValue(packageDetails);
  });

  it("returns complete package details for administrators", async () => {
    const response = await GET(makeRequest(), makeContext());

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.package.id).toBe("package_test_1");
    expect(data.package.ownerPartner.name).toBe("Test Clinic");
    expect(data.package.packageTests).toHaveLength(1);

    expect(mocks.packageFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "package_test_1",
        },
        include: {
          ownerPartner: {
            select: {
              id: true,
              name: true,
              slug: true,
              type: true,
              status: true,
              phone: true,
              email: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              state: true,
              postcode: true,
            },
          },
          packageTests: {
            orderBy: {
              sortOrder: "asc",
            },
            include: {
              labTest: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  description: true,
                  category: true,
                  isActive: true,
                },
              },
            },
          },
        },
      })
    );
  });

  it("rejects unauthenticated requests", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const response = await GET(makeRequest(), makeContext());

    expect(response.status).toBe(403);
    expect(mocks.packageFindUnique).not.toHaveBeenCalled();
  });

  it("rejects non-admin users", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: {
        id: "user_test_1",
        role: "CUSTOMER",
      },
    });

    const response = await GET(makeRequest(), makeContext());

    expect(response.status).toBe(403);
    expect(mocks.packageFindUnique).not.toHaveBeenCalled();
  });

  it("rejects an empty package ID", async () => {
    const response = await GET(makeRequest(), makeContext(" "));

    expect(response.status).toBe(400);
    expect(mocks.packageFindUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when the package does not exist", async () => {
    mocks.packageFindUnique.mockResolvedValue(null);

    const response = await GET(makeRequest(), makeContext());

    expect(response.status).toBe(404);
  });

  it("returns 500 when package retrieval fails", async () => {
    mocks.packageFindUnique.mockRejectedValue(
      new Error("Database unavailable")
    );

    const response = await GET(makeRequest(), makeContext());

    expect(response.status).toBe(500);
  });
});
